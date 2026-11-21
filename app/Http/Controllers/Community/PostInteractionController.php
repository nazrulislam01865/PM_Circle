<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\ReactToPost;
use App\Domain\Community\Actions\ReactToComment;
use App\Domain\Community\Services\EngagementStats;
use App\Support\Community\ReactionIconCatalog;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Domain\Community\Media\CommunityImageVariants;
use App\Domain\AI\Jobs\CheckCommunityComment;
use App\Support\ProfileMediaUrl;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PostInteractionController extends Controller
{
    private function ensurePublic(Post $post, ?Request $request = null): void
    {
        abort_unless($post->status === 'published' && ($post->visibility === 'public' || ($post->visibility === 'members' && $request?->user()?->onboarding_step >= 3
                && $request?->user()?->status === 'active' && ! $request?->user()?->is_admin
                && $request?->user()?->hasVerifiedEmail())), 404);
        if ($request?->user() && DB::table('post_hides')->where('post_id', $post->id)
            ->where('user_id', $request->user()->id)->exists()) {
            abort(404);
        }
    }

    private function ensureWritesOpen(): void
    {
        if (config('community.engagement_write_gate', false)) {
            throw new HttpResponseException(response()->json([
                'message' => 'Community interactions are briefly unavailable for maintenance. Please retry.',
            ], 503)->header('Retry-After', '60'));
        }
    }

    /** Load only the visible comment preview when a member expands the card. */
    public function previewComments(Request $request, Post $post): JsonResponse
    {
        $this->ensurePublic($post, $request);
        $sort = $request->query('sort') === 'newest' ? 'newest' : 'relevant';
        $query = $post->comments()->visible()->whereNull('parent_id')
            ->with(['author:id,name', 'author.profile:id,user_id,avatar_path,visibility'])
            ->withCount(['likes', 'replies' => fn ($query) => $query->visible()])
            ->with(['replies' => fn ($replies) => $replies->visible()->orderBy('created_at')->orderBy('id')->limit(2)
                ->with(['author:id,name', 'author.profile:id,user_id,avatar_path,visibility'])->withCount('likes')]);
        if ($sort === 'relevant') {
            $query->orderByDesc('likes_count');
        }
        $rows = $query->orderByDesc('id')->limit(6)->get();
        $hasMore = $rows->count() > 5;
        $rows = $rows->take(5);
        $visibleIds = $rows->flatMap(fn (Comment $comment) =>
            $comment->replies->pluck('id')->push($comment->id));
        $likedIds = $request->user() && $visibleIds->isNotEmpty()
            ? DB::table('comment_likes')->where('user_id', $request->user()->id)
                ->whereIn('comment_id', $visibleIds)->pluck('type', 'comment_id')->all()
            : [];
        $liked = $likedIds;
        $viewerId = $request->user()?->id;
        $serialize = function (Comment $comment) use (&$serialize, $liked, $viewerId): array {
            return [
                'id' => $comment->id,
                'body' => $comment->body,
                'media_url' => $comment->media_url,
                'created_at' => $comment->created_at?->toIso8601String(),
                'likes_count' => (int) $comment->likes_count,
                'replies_count' => (int) ($comment->replies_count ?? 0),
                'viewer_liked' => ($liked[$comment->id] ?? null) === 'like',
                'viewer_reaction' => $liked[$comment->id] ?? null,
                'author' => [
                    'name' => $comment->author?->name ?? 'Member',
                    'avatar_path' => $comment->author && (
                        $comment->author->id === $viewerId || $comment->author->profile?->visibility === 'public'
                    ) ? $comment->author->profile?->avatar_path : null,
                ],
                'replies' => $comment->relationLoaded('replies')
                    ? $comment->replies->map($serialize)->values()->all() : [],
            ];
        };

        return response()->json(['data' => $rows->map($serialize)->values(), 'has_more' => $hasMore]);
    }

    /** Media is private on disk: the download route checks the parent post's visibility. */
    public function commentMedia(Request $request, Post $post, Comment $comment, string $filename): BinaryFileResponse
    {
        $this->ensurePublic($post, $request);
        abort_unless($comment->post_id === $post->id && ! $comment->trashed()
            && $comment->isVisible()
            && preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)\z/iD', $filename)
            && $comment->media_path === 'comment-media/'.$filename, 404);
        return app(CommunityImageVariants::class)->response(
            'local', $comment->media_path, $request->integer('size'), false,
        );
    }

    public function comment(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        $policy = app(PostCheckPolicy::class);
        $policy->assertCanContribute($request->user()->id);
        $checking = (bool) config('pm-ai.post_check_enabled', false);
        if ($checking) $policy->assertOperational();
        $data = $request->validate([
            'body' => ['nullable', 'required_without:media', 'string', 'min:2', 'max:3000'],
            'media' => ['nullable', 'file', 'image', $checking ? 'mimes:jpg,jpeg,png,webp' : 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where('post_id', $post->id)
                ->whereNull('deleted_at')->whereNull('parent_id')],
        ]);
        if (isset($data['parent_id'])) {
            // The reply context must be public and approved, not a private pending comment.
            $parent = Comment::query()->whereKey($data['parent_id'])->where('post_id', $post->id)
                ->whereNull('parent_id')->visible()->first();
            abort_unless($parent, 422, 'The comment is unavailable for replies.');
        }
        $path = isset($data['media']) ? $data['media']->store('comment-media', 'local') : null;
        try {
            $comment = DB::transaction(function () use ($post, $request, $data, $path, $checking): Comment {
                if (EngagementStats::writesEnabled()) {
                    EngagementStats::lockMember($request->user()->id);
                }
                $comment = $post->comments()->create([
                    'body' => $data['body'] ?? '', 'parent_id' => $data['parent_id'] ?? null,
                    'author_id' => $request->user()->id, 'media_path' => $path,
                    'check_status' => $checking ? 'pending_check' : null,
                ]);
                if (! $checking) {
                    DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)
                        ->forComment($comment, $request->user()->name));
                }
                if ($checking) {
                    DB::table('comment_check_runs')->insert([
                        'comment_id' => $comment->id, 'status' => 'queued',
                        'model' => \App\Domain\AI\Services\PostContentCheckService::selectedModel(),
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    DB::afterCommit(fn () => CheckCommunityComment::dispatch($comment->id)
                        ->onQueue(config('pm-ai.post_check_queue', 'ai-editorial')));
                }
                return $comment;
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }
        if (! $checking && $path) {
            app(CommunityImageVariants::class)->queue('local', $path);
        }
        if ($request->expectsJson()) {
            return response()->json(['comment' => $this->commentResult($comment, $request),
                'check_status' => $comment->check_status], $checking ? 202 : 201);
        }
        return $checking ? back()->with('status', 'Checking your comment before publication.') : back();
    }

    /** Owner-only polling; never return pending media or another member's comment. */
    public function commentCheckStatus(Request $request, Post $post, Comment $comment): JsonResponse
    {
        abort_unless($comment->post_id === $post->id
            && $comment->author_id === $request->user()?->id && ! $comment->trashed(), 404);
        return response()->json([
            'status' => $comment->check_status ?? 'approved',
            'reason' => in_array($comment->check_status, ['restricted', 'check_error', 'pending_review'], true)
                ? $comment->check_reason : null,
            'comment' => $comment->isVisible() ? $this->commentResult($comment, $request) : null,
        ])->header('Cache-Control', 'private, no-store');
    }

    public function recheckComment(Request $request, Post $post, Comment $comment): JsonResponse
    {
        abort_unless($comment->post_id === $post->id && $comment->author_id === $request->user()->id
            && $comment->check_status === 'check_error' && ! $comment->trashed(), 404);
        app(PostCheckPolicy::class)->assertCanContribute($request->user()->id);
        app(PostCheckPolicy::class)->assertOperational();
        DB::transaction(function () use ($comment): void {
            $locked = Comment::query()->whereKey($comment->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->check_status === 'check_error', 409);
            $locked->forceFill(['check_status' => 'pending_check', 'check_reason' => null])->save();
            DB::table('comment_check_runs')->where('comment_id', $locked->id)->update([
                'status' => 'queued', 'error_code' => null, 'updated_at' => now(),
            ]);
            DB::afterCommit(fn () => CheckCommunityComment::dispatch($locked->id)
                ->onQueue(config('pm-ai.post_check_queue', 'ai-editorial')));
        }, 3);
        return response()->json(['status' => 'pending_check'], 202);
    }

    /** Shared serializer for ordinary and newly approved comments. */
    private function commentResult(Comment $comment, Request $request): array
    {
        return [
            'id' => $comment->id, 'body' => $comment->body,
            'media_url' => $comment->isVisible() ? $comment->media_url : null,
            'check_status' => $comment->check_status,
            'created_at' => $comment->created_at?->toIso8601String(),
            'likes_count' => 0, 'viewer_liked' => false, 'viewer_reaction' => null,
            'author' => [
                'name' => $request->user()->name,
                'avatar_path' => $request->user()->loadMissing('profile')->profile?->avatar_path,
            ], 'replies' => [],
        ];
    }

    public function toggleCommentLike(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed() && $comment->isVisible(), 404);
        $result = $action->execute($request->user(), $comment, null, true);

        return $request->expectsJson()
            ? response()->json(['liked' => $result['reaction'] === 'like', 'count' => $result['count']])
            : back();
    }

    public function reactToComment(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed() && $comment->isVisible(), 404);
        $data = $request->validate(['type' => ['required', Rule::in(ReactionIconCatalog::activeTypes())]]);
        $result = $action->execute($request->user(), $comment, $data['type']);

        return $request->expectsJson() ? response()->json($result) : back();
    }

    public function unreactToComment(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed() && $comment->isVisible(), 404);
        $result = $action->execute($request->user(), $comment, null);

        return $request->expectsJson() ? response()->json($result) : back();
    }

    public function react(Request $request, Post $post, ReactToPost $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        $data = $request->validate(['type' => ['required', Rule::in(ReactionIconCatalog::activeTypes())]]);
        $count = $action->execute($request->user(), $post, $data['type']);
        return $request->expectsJson()
            ? response()->json(['reaction' => $data['type'], 'count' => $count])
            : back();
    }

    public function unreact(Request $request, Post $post, ReactToPost $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        $count = $action->execute($request->user(), $post, null);
        return $request->expectsJson()
            ? response()->json(['reaction' => null, 'count' => $count])
            : back();
    }

    /** On-demand reaction tabs and bounded, cursor-stable real member rows. */
    public function reactionUsers(Request $request, Post $post): JsonResponse
    {
        $this->ensurePublic($post, $request);
        $input = $request->validate([
            'type' => ['nullable', Rule::in(ReactionIconCatalog::allTypes())],
            'after' => ['nullable', 'integer', 'min:1'],
        ]);

        $counts = array_fill_keys(ReactionIconCatalog::allTypes(), 0);
        if (EngagementStats::readsEnabled()) {
            $stats = DB::table('post_engagement_stats')->where('post_id', $post->id)
                ->first(array_map(fn (string $type): string => $type.'_count', EngagementStats::TYPES));
            foreach (EngagementStats::TYPES as $type) {
                $counts[$type] = (int) ($stats->{$type.'_count'} ?? 0);
            }
        }
        // Custom reaction counts are not stored as dynamically named SQL columns.
        // One bounded grouped query handles new and archived types, even with counter reads enabled.
        $customTypes = array_keys(ReactionIconCatalog::custom());
        if ($customTypes || ! EngagementStats::readsEnabled()) {
            $grouped = DB::table('post_reactions')->where('post_id', $post->id)
                ->whereIn('type', EngagementStats::readsEnabled() ? $customTypes : ReactionIconCatalog::allTypes())
                ->select('type')->selectRaw('COUNT(*) AS total')->groupBy('type')->get();
            foreach ($grouped as $row) {
                $counts[$row->type] = (int) $row->total;
            }
        }

        $rows = DB::table('post_reactions as r')
            ->join('users as users', 'users.id', '=', 'r.user_id')
            ->leftJoin('profiles as profile', 'profile.user_id', '=', 'users.id')
            ->where('r.post_id', $post->id)
            ->whereIn('r.type', ReactionIconCatalog::allTypes())
            ->when(isset($input['type']), fn ($query) => $query->where('r.type', $input['type']))
            ->when(isset($input['after']), fn ($query) => $query->where('r.id', '<', $input['after']))
            ->orderByDesc('r.id')->limit(21)
            ->get(['r.id', 'r.type', 'users.id as user_id', 'users.name', 'users.status', 'users.is_admin',
                'users.email_verified_at', 'profile.avatar_path', 'profile.visibility']);

        $hasMore = $rows->count() > 20;
        $page = $rows->take(20);

        return response()->json([
            'total' => array_sum($counts),
            'counts' => $counts,
            'data' => $page->map(static function ($row): array {
                $publicProfile = $row->visibility === 'public' && $row->status === 'active'
                    && ! $row->is_admin && (! config('pm-circle.email_verification_required')
                        || $row->email_verified_at !== null);

                return [
                    'id' => (int) $row->id,
                    'type' => $row->type,
                    'name' => $row->name,
                    'avatar_url' => $publicProfile ? ProfileMediaUrl::for($row->avatar_path, 'avatar') : null,
                    'profile_url' => $publicProfile ? '/members/'.$row->user_id : null,
                ];
            })->values()->all(),
            'next_cursor' => $hasMore ? (int) $page->last()->id : null,
        ])->header('Cache-Control', 'private, no-store');
    }

    /** Paginate one root's replies; never return the complete thread in one request. */
    public function replies(Request $request, Post $post, Comment $comment): JsonResponse
    {
        $this->ensurePublic($post, $request);
        abort_unless($comment->post_id === $post->id && $comment->parent_id === null && ! $comment->trashed() && $comment->isVisible(), 404);
        $data = $request->validate(['after' => ['nullable', 'integer', 'min:1']]);
        $after = null;
        if (isset($data['after'])) {
            $after = $comment->replies()->whereKey($data['after'])->first();
            abort_unless($after, 422, 'Invalid reply cursor.');
        }

        $query = $comment->replies()->visible()->with([
            'author:id,name', 'author.profile:id,user_id,avatar_path,visibility',
        ])->withCount('likes');
        if ($after) {
            $query->where(fn ($builder) => $builder->where('created_at', '>', $after->created_at)
                ->orWhere(fn ($same) => $same->where('created_at', '=', $after->created_at)
                    ->where('id', '>', $after->id)));
        }
        $rows = $query->orderBy('created_at')->orderBy('id')->limit(6)->get();
        $hasMore = $rows->count() > 5;
        $rows = $rows->take(5);
        $reactions = $request->user() && $rows->isNotEmpty()
            ? DB::table('comment_likes')->where('user_id', $request->user()->id)
                ->whereIn('comment_id', $rows->pluck('id'))->pluck('type', 'comment_id')
            : collect();
        $viewerId = $request->user()?->id;

        return response()->json([
            'data' => $rows->map(fn (Comment $reply) => [
                'id' => $reply->id, 'body' => $reply->body, 'media_url' => $reply->media_url,
                'created_at' => $reply->created_at?->toIso8601String(),
                'likes_count' => (int) $reply->likes_count,
                'viewer_liked' => $reactions->get($reply->id) === 'like',
                'viewer_reaction' => $reactions->get($reply->id),
                'author' => [
                    'name' => $reply->author?->name ?? 'Member',
                    'avatar_path' => $reply->author && ($reply->author->id === $viewerId
                        || $reply->author->profile?->visibility === 'public')
                        ? $reply->author->profile?->avatar_path : null,
                ],
                'replies' => [],
            ])->values()->all(),
            'has_more' => $hasMore,
        ]);
    }

    public function save(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        DB::table('post_saves')->insertOrIgnore(['post_id' => $post->id, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        return $request->expectsJson() ? response()->json(['saved' => true]) : back();
    }

    public function unsave(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $post->saves()->where('user_id', $request->user()->id)->delete();
        return $request->expectsJson() ? response()->json(['saved' => false]) : back();
    }
}
