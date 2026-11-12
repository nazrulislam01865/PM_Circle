<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\PublishPost;
use App\Http\Requests\Community\StorePostRequest;
use App\Models\Post;
use App\Models\Scenario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(Request $request, \App\Domain\Community\Queries\FeedQuery $feed): Response
    {
        $validated = $request->validate([
            'topic' => ['nullable', 'in:All,Questions,I learned,From my project,Ask the community'],
            'search' => ['nullable', 'string', 'max:80'],
            'tab' => ['nullable', 'in:all,following,mine'],
        ]);
        $topic = $validated['topic'] ?? 'All';
        $tab = $validated['tab'] ?? 'all';
        $search = $validated['search'] ?? null;

        $todayScenario = Scenario::query()->where('status', 'published')
            ->latest('published_at')->first(['id', 'slug', 'title', 'summary']);

        return Inertia::render('community/Feed', [
            'posts' => $feed->page($tab, $topic, $search, $request->user()),
            'activeTopic' => $topic,
            'feedTab' => $tab,
            'search' => $search,
            'todayScenario' => $todayScenario,
            'virtualFeedEnabled' => (bool) config('pm-circle.virtual_feed_enabled', true),
        ]);
    }

    /** 12-item JSON cursor pages; no Inertia shell or extra scenario query. */
    public function feedPage(Request $request, \App\Domain\Community\Queries\FeedQuery $feed): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'tab' => ['nullable', 'in:all,following,mine'],
            'topic' => ['nullable', 'in:All,Questions,I learned,From my project,Ask the community'],
            'search' => ['nullable', 'string', 'max:80'],
            'cursor' => ['required', 'string', 'max:4096'],
            'context' => ['nullable', 'in:community,dashboard'],
        ]);
        $dashboard = ($validated['context'] ?? 'community') === 'dashboard';
        if ($dashboard) {
            abort_unless($request->user() && $request->user()->onboarding_step >= 3, 403);
        }

        $page = $feed->page($validated['tab'] ?? 'all', $validated['topic'] ?? 'All',
            $validated['search'] ?? null, $request->user(), $validated['cursor'], $dashboard);
        if ($dashboard) {
            $page['data'] = $feed->dashboardPosts($page['data']);
        }

        return response()->json($page)->header('Cache-Control', 'private, no-store');
    }

    public function show(Post $post, Request $request): Response
    {
        abort_unless($post->status === 'published' && ($post->visibility === 'public' || ($post->visibility === 'members' && $request->user()?->onboarding_step >= 3
            && $request->user()?->status === 'active' && ! $request->user()?->is_admin
            && $request->user()?->hasVerifiedEmail())), 404);
        if ($request->user() && \Illuminate\Support\Facades\DB::table('post_hides')
            ->where('post_id', $post->id)->where('user_id', $request->user()->id)->exists()) {
            abort(404);
        }
        $post->load([
            'author:id,name',
            'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'role', 'avatar_path')
        ])->loadCount([
            'comments',
            'reactions',
            'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
            'reactions as loves_count' => fn ($query) => $query->where('type', 'love'),
        ]);

        $comments = $post->comments()
            ->whereNull('parent_id')
            ->with(['author:id,name', 'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'avatar_path')])
            ->withCount('likes')
            ->with(['replies' => fn ($query) => $query->with(['author:id,name', 'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'avatar_path')])->withCount('likes')])
            ->oldest()
            ->paginate(12);

        if ($post->topic === 'Poll') $post->load(['pollOptions' => fn ($query) => $query->withCount('votes')]);
        $post->setAttribute('viewer_vote', $request->user() && $post->topic === 'Poll'
            ? (int) (\Illuminate\Support\Facades\DB::table('post_poll_votes')->where('post_id', $post->id)
                ->where('user_id', $request->user()->id)->value('option_id') ?? 0) : null);
        $post->setAttribute('viewer_is_author', (bool) ($request->user() && $post->author_id === $request->user()->id));
        $post->setAttribute('viewer_muted', (bool) ($post->viewer_is_author && $post->notifications_muted_at));
        $post->anonymizeForPublic();

        $viewerCommentReactions = $request->user() ? \Illuminate\Support\Facades\DB::table('comment_likes')
            ->where('user_id', $request->user()->id)
            ->whereIn('comment_id', \Illuminate\Support\Facades\DB::table('comments')->where('post_id', $post->id)->select('id'))
            ->pluck('type', 'comment_id') : collect();

        return Inertia::render('community/PostShow', [
            'post' => $post,
            'comments' => $comments,
            'viewerReaction' => $request->user() ? $post->reactions()->where('user_id', $request->user()->id)->value('type') : null,
            'viewerSaved' => $request->user() ? $post->saves()->where('user_id', $request->user()->id)->exists() : false,
            'viewerLikedCommentIds' => $viewerCommentReactions->filter(fn ($type) => $type === 'like')->keys()->values(),
            'viewerCommentReactions' => $viewerCommentReactions,
            'showDemoContent' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
            'relatedPosts' => Post::query()
                ->where('status', 'published')
                ->where('visibility', 'public')
                ->where('id', '!=', $post->id)
                ->when($request->user(), fn ($query) => $query->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
                    ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                    ->where('post_hides.user_id', $request->user()->id)))
                ->when(app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'), fn ($q) => $q->whereNotNull('title'))
                ->withCount('comments')
                ->latest('published_at')
                ->limit(2)
                ->get(['id', 'title', 'body']),
        ]);
    }

    /** Public post media is served without requiring a storage symlink. */
    /** Serve members-only images only after checking post visibility and exact stored filename. */
    public function privateMedia(Request $request, Post $post, string $filename): BinaryFileResponse
    {
        abort_unless($request->user()?->onboarding_step >= 3 && $request->user()?->status === 'active'
            && ! $request->user()?->is_admin && $request->user()?->hasVerifiedEmail()
            && $post->status === 'published'
            && $post->visibility === 'members'
            && $post->image_path === '/posts/'.$post->id.'/media/'.$filename
            && preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $filename), 404);
        $path = 'post-images-private/'.$filename;
        $disk = Storage::disk('local');
        abort_unless($disk->exists($path), 404);
        return response()->file($disk->path($path), [
            'Content-Type' => match (strtolower(pathinfo($filename, PATHINFO_EXTENSION))) {
                'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg',
            },
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function media(string $filename): BinaryFileResponse
    {
        abort_unless(preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $filename), 404);
        $path = 'post-images/'.$filename;
        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);

        // Use the same binary-file response as the working profile-image endpoint.
        // This preserves the exact image bytes and avoids a streamed response being modified.
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        return response()->file($disk->path($path), [
            'Content-Type' => match ($extension) {
                'png' => 'image/png',
                'webp' => 'image/webp',
                default => 'image/jpeg',
            },
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function store(StorePostRequest $request, PublishPost $action): RedirectResponse
    {
        $post = $action->execute($request->user(), $request->validated());
        if ($post->status === 'pending_review') {
            return to_route('dashboard')->with('status', 'Your anonymous post has been sent to the moderation team for review.');
        }
        return ($request->validated('return_to') === 'dashboard')
            ? to_route('dashboard')->with('status', 'Your post has been published.')
            : to_route('posts.show', $post);
    }
}
