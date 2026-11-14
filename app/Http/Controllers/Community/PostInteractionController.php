<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\ReactToPost;
use App\Domain\Community\Actions\ReactToComment;
use App\Domain\Community\Services\EngagementStats;
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
        $query = $post->comments()->whereNull('parent_id')
            ->with(['author:id,name', 'author.profile:id,user_id,avatar_path,visibility'])
            ->withCount(['likes', 'replies'])
            ->with(['replies' => fn ($replies) => $replies->orderBy('created_at')->orderBy('id')->limit(2)
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
            && preg_match('/\A[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)\z/iD', $filename)
            && $comment->media_path === 'comment-media/'.$filename, 404);
        $disk = Storage::disk('local');
        abort_unless($disk->exists($comment->media_path), 404);

        return response()->file($disk->path($comment->media_path), [
            'Content-Type' => match (strtolower(pathinfo($filename, PATHINFO_EXTENSION))) {
                'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', default => 'image/jpeg',
            },
            'Content-Disposition' => 'inline',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function comment(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        $data = $request->validate([
            'body' => ['nullable', 'required_without:media', 'string', 'min:2', 'max:3000'],
            'media' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where('post_id', $post->id)
                ->whereNull('deleted_at')->whereNull('parent_id')],
        ]);
        $path = isset($data['media']) ? $data['media']->store('comment-media', 'local') : null;
        try {
            $comment = DB::transaction(function () use ($post, $request, $data, $path): Comment {
                if (EngagementStats::writesEnabled()) {
                    EngagementStats::lockMember($request->user()->id);
                }
                return $post->comments()->create([
                    'body' => $data['body'] ?? '', 'parent_id' => $data['parent_id'] ?? null,
                    'author_id' => $request->user()->id, 'media_path' => $path,
                ]);
            }, 3);
        } catch (\Throwable $exception) {
            if ($path) Storage::disk('local')->delete($path);
            throw $exception;
        }
        if ($request->expectsJson()) {
            return response()->json(['comment' => [
                'id' => $comment->id, 'body' => $comment->body, 'media_url' => $comment->media_url,
                'created_at' => $comment->created_at?->toIso8601String(),
                'likes_count' => 0, 'viewer_liked' => false, 'viewer_reaction' => null,
                'author' => [
                    'name' => $request->user()->name,
                    'avatar_path' => $request->user()->loadMissing('profile')->profile?->avatar_path,
                ], 'replies' => [],
            ]], 201);
        }
        return back();
    }

    public function toggleCommentLike(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);
        $result = $action->execute($request->user(), $comment, null, true);

        return $request->expectsJson()
            ? response()->json(['liked' => $result['reaction'] === 'like', 'count' => $result['count']])
            : back();
    }

    public function reactToComment(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]]);
        $result = $action->execute($request->user(), $comment, $data['type']);

        return $request->expectsJson() ? response()->json($result) : back();
    }

    public function unreactToComment(Request $request, Post $post, Comment $comment, ReactToComment $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);
        $result = $action->execute($request->user(), $comment, null);

        return $request->expectsJson() ? response()->json($result) : back();
    }

    public function react(Request $request, Post $post, ReactToPost $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $this->ensureWritesOpen();
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]]);
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

    /** Paginate one root's replies; never return the complete thread in one request. */
    public function replies(Request $request, Post $post, Comment $comment): JsonResponse
    {
        $this->ensurePublic($post, $request);
        abort_unless($comment->post_id === $post->id && $comment->parent_id === null && ! $comment->trashed(), 404);
        $data = $request->validate(['after' => ['nullable', 'integer', 'min:1']]);
        $after = null;
        if (isset($data['after'])) {
            $after = $comment->replies()->whereKey($data['after'])->first();
            abort_unless($after, 422, 'Invalid reply cursor.');
        }

        $query = $comment->replies()->with([
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
