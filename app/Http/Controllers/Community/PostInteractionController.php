<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\ReactToPost;
use Illuminate\Support\Facades\DB;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PostInteractionController extends Controller
{
    private function ensurePublic(Post $post): void
    {
        abort_unless($post->status === 'published' && $post->visibility === 'public', 404);
    }

    /** Load only the visible comment preview when a member expands the card. */
    public function previewComments(Request $request, Post $post): JsonResponse
    {
        $this->ensurePublic($post);
        $sort = $request->query('sort') === 'newest' ? 'newest' : 'relevant';
        $query = $post->comments()->whereNull('parent_id')
            ->with(['author:id,name', 'author.profile:id,user_id,avatar_path,visibility'])
            ->withCount('likes')
            ->with(['replies' => fn ($replies) => $replies->oldest('id')->limit(2)
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
                ->whereIn('comment_id', $visibleIds)->pluck('comment_id')->all()
            : [];
        $liked = array_fill_keys($likedIds, true);
        $viewerId = $request->user()?->id;
        $serialize = function (Comment $comment) use (&$serialize, $liked, $viewerId): array {
            return [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
                'likes_count' => (int) $comment->likes_count,
                'viewer_liked' => isset($liked[$comment->id]),
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

    public function comment(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post);
        $data = $request->validate(['body' => ['required', 'string', 'min:2', 'max:3000'], 'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where('post_id', $post->id)->whereNull('deleted_at')->whereNull('parent_id')]]);
        $comment = $post->comments()->create(['body' => $data['body'], 'parent_id' => $data['parent_id'] ?? null, 'author_id' => $request->user()->id]);
        if ($request->expectsJson()) {
            return response()->json(['comment' => [
                'id' => $comment->id, 'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
                'likes_count' => 0, 'viewer_liked' => false,
                'author' => [
                    'name' => $request->user()->name,
                    'avatar_path' => $request->user()->loadMissing('profile')->profile?->avatar_path,
                ], 'replies' => [],
            ]], 201);
        }
        return back();
    }

    public function toggleCommentLike(Request $request, Post $post, Comment $comment): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post);
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);

        $exists = $comment->likes()->where('user_id', $request->user()->id)->exists();
        if ($exists) {
            $comment->likes()->where('user_id', $request->user()->id)->delete();
        } else {
            DB::table('comment_likes')->insertOrIgnore([
                'comment_id' => $comment->id, 'user_id' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        return $request->expectsJson()
            ? response()->json(['liked' => ! $exists, 'count' => $comment->likes()->count()])
            : back();
    }

    public function react(Request $request, Post $post, ReactToPost $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post);
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]]);
        $action->execute($request->user(), $post, $data['type']);
        return $request->expectsJson()
            ? response()->json(['reaction' => $data['type'], 'count' => $post->reactions()->count()])
            : back();
    }

    public function unreact(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post);
        $post->reactions()->where('user_id', $request->user()->id)->delete();
        return $request->expectsJson()
            ? response()->json(['reaction' => null, 'count' => $post->reactions()->count()])
            : back();
    }

    public function save(Request $request, Post $post): RedirectResponse
    {
        $this->ensurePublic($post);
        DB::table('post_saves')->insertOrIgnore(['post_id' => $post->id, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        return back();
    }

    public function unsave(Request $request, Post $post): RedirectResponse
    {
        $post->saves()->where('user_id', $request->user()->id)->delete();
        return back();
    }
}
