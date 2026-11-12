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

    /** Load only the visible comment preview when a member expands the card. */
    public function previewComments(Request $request, Post $post): JsonResponse
    {
        $this->ensurePublic($post, $request);
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
        $data = $request->validate([
            'body' => ['nullable', 'required_without:media', 'string', 'min:2', 'max:3000'],
            'media' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'],
            'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where('post_id', $post->id)
                ->whereNull('deleted_at')->whereNull('parent_id')],
        ]);
        $path = isset($data['media']) ? $data['media']->store('comment-media', 'local') : null;
        try {
            $comment = $post->comments()->create([
                'body' => $data['body'] ?? '', 'parent_id' => $data['parent_id'] ?? null,
                'author_id' => $request->user()->id, 'media_path' => $path,
            ]);
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

    public function toggleCommentLike(Request $request, Post $post, Comment $comment): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
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

    /** Same seven reactions as posts; the existing unique comment/user key prevents duplicates. */
    public function reactToComment(Request $request, Post $post, Comment $comment): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]]);
        DB::table('comment_likes')->upsert([[
            'comment_id' => $comment->id,
            'user_id' => $request->user()->id,
            'type' => $data['type'],
            'created_at' => now(),
            'updated_at' => now(),
        ]], ['comment_id', 'user_id'], ['type', 'updated_at']);

        return $request->expectsJson()
            ? response()->json(['reaction' => $data['type'], 'count' => $comment->likes()->count()])
            : back();
    }

    public function unreactToComment(Request $request, Post $post, Comment $comment): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        abort_unless($comment->post_id === $post->id && ! $comment->trashed(), 404);
        $comment->likes()->where('user_id', $request->user()->id)->delete();

        return $request->expectsJson()
            ? response()->json(['reaction' => null, 'count' => $comment->likes()->count()])
            : back();
    }

    public function react(Request $request, Post $post, ReactToPost $action): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'])]]);
        $action->execute($request->user(), $post, $data['type']);
        return $request->expectsJson()
            ? response()->json(['reaction' => $data['type'], 'count' => $post->reactions()->count()])
            : back();
    }

    public function unreact(Request $request, Post $post): RedirectResponse|JsonResponse
    {
        $this->ensurePublic($post, $request);
        $post->reactions()->where('user_id', $request->user()->id)->delete();
        return $request->expectsJson()
            ? response()->json(['reaction' => null, 'count' => $post->reactions()->count()])
            : back();
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
