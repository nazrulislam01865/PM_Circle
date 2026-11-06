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
    public function index(Request $request): Response
    {
        $topic = $request->query('topic', 'All');
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:80'],
            'tab' => ['nullable', 'in:all,following,mine'],
        ]);
        $search = $validated['search'] ?? null;
        $feedTab = $validated['tab'] ?? 'all';
        $posts = Post::query()->forFeed($feedTab, $request->user()?->id)
            ->when(in_array($topic, ['Questions', 'I learned', 'From my project', 'Ask the community']), function ($q) use ($topic) {
                if ($topic === 'Questions') {
                    $q->whereIn('topic', ['Questions', 'Ask the community']);
                } else {
                    $q->where('topic', $topic);
                }
            })
            ->when(filled($search), fn ($q) => $q->where(fn ($inner) => $inner
                ->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(body) LIKE ?', ['%'.mb_strtolower($search).'%'])))
            ->with([
                'author:id,name',
                'author.profile' => fn ($q) => $q->where('visibility', 'public')->select('id', 'user_id', 'role', 'avatar_path')
            ])
            ->withCount([
                'comments',
                'reactions',
                'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
            ])
            ->latest('published_at')->orderByDesc('posts.id')
            ->cursorPaginate(12)
            ->withQueryString();

        // One batched lookup for the current user's selection across the visible page.
        $viewerReactions = $request->user() && $posts->getCollection()->isNotEmpty()
            ? \Illuminate\Support\Facades\DB::table('post_reactions')
                ->where('user_id', $request->user()->id)
                ->whereIn('post_id', $posts->getCollection()->pluck('id'))
                ->pluck('type', 'post_id')
            : collect();
        $posts->getCollection()->each(function (Post $post) use ($viewerReactions): void {
            $post->setAttribute('viewer_reaction', $viewerReactions->get($post->id));
            $post->anonymizeForPublic();
        });

        $todayScenario = Scenario::query()
            ->where('status', 'published')
            ->latest('published_at')
            ->first(['id', 'slug', 'title', 'summary']);

        return Inertia::render('community/Feed', [
            'posts' => $posts,
            'activeTopic' => $topic,
            'feedTab' => $feedTab,
            'search' => $search,
            'todayScenario' => $todayScenario,
        ]);
    }

    public function show(Post $post, Request $request): Response
    {
        abort_unless($post->status === 'published' && $post->visibility === 'public', 404);
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

        $post->anonymizeForPublic();

        return Inertia::render('community/PostShow', [
            'post' => $post,
            'comments' => $comments,
            'viewerReaction' => $request->user() ? $post->reactions()->where('user_id', $request->user()->id)->value('type') : null,
            'viewerSaved' => $request->user() ? $post->saves()->where('user_id', $request->user()->id)->exists() : false,
            'viewerLikedCommentIds' => $request->user() ? \Illuminate\Support\Facades\DB::table('comment_likes')
                ->where('user_id', $request->user()->id)
                ->whereIn('comment_id', \Illuminate\Support\Facades\DB::table('comments')->where('post_id', $post->id)->select('id'))
                ->pluck('comment_id') : [],
            'showDemoContent' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
            'relatedPosts' => Post::query()
                ->where('status', 'published')
                ->where('visibility', 'public')
                ->where('id', '!=', $post->id)
                ->when(app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'), fn ($q) => $q->whereNotNull('title'))
                ->withCount('comments')
                ->latest('published_at')
                ->limit(2)
                ->get(['id', 'title', 'body']),
        ]);
    }

    /** Public post media is served without requiring a storage symlink. */
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
        return ($request->validated('return_to') === 'dashboard')
            ? to_route('dashboard')
            : to_route('posts.show', $post);
    }
}
