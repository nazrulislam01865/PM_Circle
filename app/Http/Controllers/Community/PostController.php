<?php

namespace App\Http\Controllers\Community;

use App\Domain\Identity\Services\MemberProfileAccess;
use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\PublishPost;
use App\Domain\Community\Services\EngagementStats;
use App\Domain\Community\Queries\PostReactionSummary;
use App\Domain\Community\Queries\RelevantCommentPage;
use App\Domain\Community\Queries\FeedTabAvailability;
use App\Domain\Community\Queries\PostCheckFeed;
use App\Http\Requests\Community\StorePostRequest;
use App\Models\Post;
use App\Models\Scenario;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Domain\Community\Media\CommunityImageVariants;
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
            'tab' => ['nullable', 'in:all,following,mine,saved,hidden'],
        ]);
        $topic = $validated['topic'] ?? 'All';
        $tab = $validated['tab'] ?? 'all';
        $search = $validated['search'] ?? null;

        $todayScenario = Scenario::query()->where('status', 'published')
            ->latest('published_at')->first(['id', 'slug', 'title', 'summary']);

        $viewer = $request->user();
        $canCompose = $viewer && $viewer->status === 'active' && ! $viewer->is_admin
            && $viewer->onboarding_step >= 3 && $viewer->hasVerifiedEmail();

        return Inertia::render('community/Feed', [
            'postChecks' => fn () => $canCompose ? app(PostCheckFeed::class)->forMember($viewer->id) : null,
            'flashStatus' => fn () => $canCompose ? $request->session()->get('status') : null,
            'posts' => $feed->page($tab, $topic, $search, $request->user()),
            'activeTopic' => $topic,
            'feedTab' => $tab,
            'feedScopeCounts' => app(FeedTabAvailability::class)->forViewer($request->user()),
            'search' => $search,
            'todayScenario' => $todayScenario,
            'virtualFeedEnabled' => (bool) config('pm-circle.virtual_feed_enabled', true),
        ]);
    }

    /** 12-item JSON cursor pages; no Inertia shell or extra scenario query. */
    public function feedPage(Request $request, \App\Domain\Community\Queries\FeedQuery $feed): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'tab' => ['nullable', 'in:all,following,mine,saved,hidden'],
            'topic' => ['nullable', 'in:All,Questions,I learned,From my project,Ask the community'],
            'search' => ['nullable', 'string', 'max:80'],
            'cursor' => ['required', 'string', 'max:4096'],
            'context' => ['nullable', 'in:community,dashboard'],
        ]);
        $dashboard = ($validated['context'] ?? 'community') === 'dashboard';
        if ($dashboard) {
            abort_unless($request->user(), 401);
            abort_unless($request->user()->onboarding_step >= 3 && $request->user()->status === 'active'
                && ! $request->user()->is_admin && $request->user()->hasVerifiedEmail(), 403);
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
            'author:id,name,status,is_admin,email_verified_at',
            'author.profile:id,user_id,role,avatar_path,visibility,field_visibility'
        ]);
        if (EngagementStats::readsEnabled()) {
            $stats = \Illuminate\Support\Facades\DB::table('post_engagement_stats')
                ->where('post_id', $post->id)->first();
            foreach (['comments', 'reactions', 'likes', 'loves'] as $label) {
                $column = match ($label) {
                    'comments' => 'comments_count', 'reactions' => 'reactions_count',
                    'likes' => 'like_count', 'loves' => 'love_count',
                };
                $post->setAttribute($label.'_count', $stats ? (int) $stats->{$column} : null);
            }
        } else {
            $post->loadCount([
                'comments' => fn ($query) => $query->visible(), 'reactions',
                'reactions as likes_count' => fn ($query) => $query->where('type', 'like'),
                'reactions as loves_count' => fn ($query) => $query->where('type', 'love'),
            ]);
        }

        // One per-post read for the detail page; the feed uses a batched projection.
        if (EngagementStats::readsEnabled()) {
            $post->setAttribute('engagement_version', $stats->version ?? null);
            foreach (EngagementStats::TYPES as $type) {
                $post->setAttribute($type.'_count', $stats ? (int) $stats->{$type.'_count'} : null);
            }
        }
        PostReactionSummary::attach(collect([$post]));

        $commentQuery = $post->comments()
            ->visible()->whereNull('parent_id')
            ->with(['author:id,name,status,is_admin,email_verified_at', 'author.profile:id,user_id,role,avatar_path,visibility,field_visibility'])
            ->withEngagement(true)
            ->with(['replies' => fn ($query) => $query->visible()->orderBy('created_at')->orderBy('id')->limit(2)
                ->with(['author:id,name,status,is_admin,email_verified_at', 'author.profile:id,user_id,role,avatar_path,visibility,field_visibility'])->withEngagement()])
            ;
        $commentSort = $request->query('sort') === 'newest' ? 'newest' : 'relevant';
        if ($commentSort === 'newest') {
            $page = $commentQuery->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate(12)->appends(['sort' => 'newest']);
            $commentRows = $page->getCollection();
            $nextCommentPage = $page->nextPageUrl();
            $refreshRelevant = false;
        } else {
            $ranked = RelevantCommentPage::page($post, $request, $commentQuery->getQuery());
            $commentRows = $ranked['rows'];
            $nextCommentPage = $ranked['next'];
            $refreshRelevant = $ranked['refresh'];
        }


        if ($post->topic === 'Poll') $post->load(['pollOptions' => fn ($query) => $query->withCount('votes')]);
        $post->setAttribute('viewer_vote', $request->user() && $post->topic === 'Poll'
            ? (int) (\Illuminate\Support\Facades\DB::table('post_poll_votes')->where('post_id', $post->id)
                ->where('user_id', $request->user()->id)->value('option_id') ?? 0) : null);
        $post->setAttribute('viewer_is_author', (bool) ($request->user() && $post->author_id === $request->user()->id));
        $post->setAttribute('viewer_muted', (bool) ($post->viewer_is_author && $post->notifications_muted_at));
        MemberProfileAccess::decorateAuthor($post->author, $request->user());
        $post->anonymizeForPublic();

        foreach ($commentRows as $comment) {
            MemberProfileAccess::decorateAuthor($comment->author, $request->user());
            foreach ($comment->replies as $reply) {
                MemberProfileAccess::decorateAuthor($reply->author, $request->user());
            }
        }

        $visibleCommentIds = $commentRows->flatMap(fn ($root) =>
            $root->replies->pluck('id')->push($root->id))->all();
        $viewerCommentReactions = $request->user() && $visibleCommentIds
            ? \Illuminate\Support\Facades\DB::table('comment_likes')
                ->where('user_id', $request->user()->id)
                ->whereIn('comment_id', $visibleCommentIds)->pluck('type', 'comment_id')
            : collect();

        return Inertia::render('community/PostShow', [
            'post' => $post,
            'comments' => ['data' => $commentRows, 'next_page_url' => $nextCommentPage, 'refresh_relevant' => $refreshRelevant],
            'commentSort' => $commentSort,
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
                ->when(EngagementStats::readsEnabled(), fn ($query) => $query
                    ->leftJoin('post_engagement_stats as related_stats', 'related_stats.post_id', '=', 'posts.id')
                    ->select('posts.id', 'posts.title', 'posts.body')
                    ->selectRaw("COALESCE(related_stats.comments_count, (SELECT COUNT(*) FROM comments c WHERE c.post_id = posts.id AND c.deleted_at IS NULL AND (c.check_status IS NULL OR c.check_status = 'approved') AND (c.parent_id IS NULL OR EXISTS (SELECT 1 FROM comments r WHERE r.id = c.parent_id AND r.post_id = c.post_id AND r.parent_id IS NULL AND r.deleted_at IS NULL AND (r.check_status IS NULL OR r.check_status = 'approved'))))) AS comments_count"))
                ->when(! EngagementStats::readsEnabled(), fn ($query) => $query->withCount(['comments' => fn ($query) => $query->visible()]))
                ->latest('posts.published_at')
                ->limit(2)
                ->get(['posts.id', 'posts.title', 'posts.body']),
        ]);
    }

    /** Only the submitting member can preview unapproved attachments. */
    public function checkMedia(Request $request, Post $post, string $filename): BinaryFileResponse
    {
        abort_unless($request->user() && $request->user()->id === $post->author_id
            && in_array($post->status, ['pending_check', 'restricted', 'check_error'], true)
            && preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $filename)
            && $post->getRawOriginal('image_path') === '/posts/'.$post->id.'/check-media/'.$filename, 404);
        $disk = Storage::disk('local');
        $path = 'post-check-images/'.$filename;
        abort_unless($disk->exists($path), 404);
        return response()->file($disk->path($path), [
            'Content-Type' => match (strtolower(pathinfo($filename, PATHINFO_EXTENSION))) {
                'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg',
            },
            'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
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
        return app(CommunityImageVariants::class)->response(
            'local', 'post-images-private/'.$filename, $request->integer('size'), false,
        );
    }

    public function media(Request $request, string $filename): BinaryFileResponse
    {
        abort_unless(preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $filename), 404);
        return app(CommunityImageVariants::class)->response(
            'public', 'post-images/'.$filename, $request->integer('size'), true,
        );
    }

    public function store(StorePostRequest $request, PublishPost $action): RedirectResponse
    {
        app(PostCheckPolicy::class)->assertCanContribute($request->user()->id);
        if (config('pm-ai.post_check_enabled', false)) {
            app(PostCheckPolicy::class)->assertOperational();
        }
        $post = $action->execute($request->user(), $request->validated());
        $message = match ($post->status) {
            'pending_check' => 'Checking your post. It will appear in the feed once it passes the check.',
            'pending_review' => 'Your post is awaiting an additional safety review.',
            default => 'Your post has been published.',
        };
        return to_route($request->validated('return_to') === 'community' ? 'community.index' : 'dashboard')->with('status', $message);
    }
}
