<?php

namespace App\Http\Controllers\Community;

use App\Http\Controllers\Controller;
use App\Domain\Community\Actions\ReactToPost;
use Illuminate\Support\Facades\DB;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PostInteractionController extends Controller
{
    private function ensurePublic(Post $post): void
    {
        abort_unless($post->status === 'published' && $post->visibility === 'public', 404);
    }

    public function comment(Request $request, Post $post): RedirectResponse
    {
        $this->ensurePublic($post);
        $data = $request->validate(['body' => ['required', 'string', 'min:2', 'max:3000'], 'parent_id' => ['nullable', 'integer', Rule::exists('comments', 'id')->where('post_id', $post->id)->whereNull('deleted_at')->whereNull('parent_id')]]);
        $post->comments()->create(['body' => $data['body'], 'parent_id' => $data['parent_id'] ?? null, 'author_id' => $request->user()->id]);
        return back();
    }

    public function toggleCommentLike(Request $request, Post $post, Comment $comment): RedirectResponse
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

        return back();
    }

    public function react(Request $request, Post $post, ReactToPost $action): RedirectResponse
    {
        $this->ensurePublic($post);
        $data = $request->validate(['type' => ['required', Rule::in(['like', 'love'])]]);
        $action->execute($request->user(), $post, $data['type']);
        return back();
    }

    public function unreact(Request $request, Post $post): RedirectResponse
    {
        $post->reactions()->where('user_id', $request->user()->id)->delete();
        return back();
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
