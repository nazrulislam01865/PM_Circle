<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Comment;
use App\Domain\Community\Services\PostCheckMedia;
use App\Domain\Community\Media\CommunityImageVariants;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Domain\Community\Services\EngagementStats;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class PostModerationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/PostModeration', [
            'pendingComments' => Comment::query()->where('check_status', 'pending_review')
                ->with('author:id,name')->select(['id', 'post_id', 'author_id', 'body',
                    'media_path', 'check_reason', 'created_at'])->latest('id')->limit(30)->get()
                ->map(fn (Comment $comment) => [
                    'id' => $comment->id, 'post_id' => $comment->post_id,
                    'author_name' => $comment->author?->name ?? 'Member',
                    'body' => $comment->body, 'reason' => $comment->check_reason,
                    'has_image' => (bool) $comment->media_path,
                    'created_at' => $comment->created_at,
                ]),
            'pendingPosts' => Post::query()->where('status', 'pending_review')
                ->with('author:id,name')
                ->select(['id', 'author_id', 'body', 'image_path', 'topic', 'visibility', 'created_at'])
                ->latest('id')->limit(30)->get()
                ->map(fn (Post $post) => [
                    'id' => $post->id, 'body' => $post->body, 'topic' => $post->topic,
                    'visibility' => $post->visibility, 'created_at' => $post->created_at,
                    'author' => $post->author ? ['name' => $post->author->name] : null,
                    'has_image' => (bool) $post->getRawOriginal('image_path'),
                ]),
            'reports' => DB::table('post_reports as reports')
                ->join('posts', 'posts.id', '=', 'reports.post_id')
                ->join('users as reporters', 'reporters.id', '=', 'reports.reporter_id')
                ->select('reports.id', 'reports.reason', 'reports.details', 'reports.status', 'reports.created_at',
                    'posts.id as post_id', 'posts.body as post_body', 'reporters.name as reporter_name')
                ->orderByRaw("CASE WHEN reports.status = 'pending' THEN 0 ELSE 1 END")
                ->orderByDesc('reports.created_at')->paginate(20),
        ]);
    }

    public function reviewPost(Request $request, Post $post, PostCheckMedia $media): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])]]);
        abort_unless($post->status === 'pending_review', 404);
        $oldPath = $post->getRawOriginal('image_path');
        DB::transaction(function () use ($post, $data, $media): void {
            $locked = Post::query()->whereKey($post->id)->lockForUpdate()->firstOrFail();
            abort_unless($locked->status === 'pending_review', 409);
            if ($data['decision'] === 'approve') $media->approve($locked);
            $locked->forceFill([
                'status' => $data['decision'] === 'approve' ? 'published' : 'rejected',
                'published_at' => $data['decision'] === 'approve' ? now() : null,
            ])->save();
            // A human-confirmed rejection of flagged content is a confirmed violation.
            // Older non-AI review items without a check version are not penalized.
            if ($data['decision'] === 'reject' && $locked->check_version > 0) {
                app(PostCheckPolicy::class)->recordViolation(
                    $locked->id, $locked->check_version, $locked->author_id,
                    $locked->check_category ?: 'manual_review',
                );
            }
        }, 3);
        if ($data['decision'] === 'approve') $media->cleanupApproved($post, $oldPath);
        return back()->with('status', 'Post review recorded.');
    }

    /** Admin-only access to staged/approved review imagery. */
    public function reviewPostMedia(Post $post, PostCheckMedia $media): \Illuminate\Http\Response
    {
        abort_unless($post->status === 'pending_review' && $post->getRawOriginal('image_path'), 404);
        [$bytes, $mime] = $media->bytes($post);
        abort_unless(is_string($bytes) && is_string($mime), 404);
        return response($bytes, 200, [
            'Content-Type' => $mime, 'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Human review for genuinely ambiguous comment/reply classifications. */
    public function reviewComment(Request $request, Comment $comment): RedirectResponse
    {
        $data = $request->validate(['decision' => ['required', Rule::in(['approve', 'reject'])]]);
        DB::transaction(function () use ($comment, $data): void {
            abort_if(config('community.engagement_write_gate'), 503, 'Community engagement is temporarily paused.', ['Retry-After' => '60']);
            EngagementStats::lockMember($comment->author_id);
            EngagementStats::lockPost($comment->post_id);
            $locked = EngagementStats::lockComment($comment);
            abort_if($locked->trashed(), 404);
            abort_unless($locked->check_status === 'pending_review', 404);
            $locked->check_status = $data['decision'] === 'approve' ? 'approved' : 'restricted';
            $locked->checked_at = now();
            $locked->check_reason = $data['decision'] === 'approve' ? null
                : ($locked->check_reason ?: 'Restricted after administrator review.');
            if ($data['decision'] === 'approve' && $locked->isVisible()) {
                DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)
                    ->forComment($locked));
            }
            $locked->save();
            if ($data['decision'] === 'reject') {
                app(PostCheckPolicy::class)->recordCommentViolation(
                    $locked->id, $locked->author_id, 'manual_review',
                );
            }
        }, 3);
        if ($data['decision'] === 'approve') {
            app(CommunityImageVariants::class)->queue('local', $comment->media_path);
        }
        return back()->with('status', 'Comment review recorded.');
    }

    public function reviewCommentMedia(Comment $comment): BinaryFileResponse
    {
        abort_unless($comment->check_status === 'pending_review' && $comment->media_path, 404);
        $name = basename($comment->media_path);
        abort_unless(preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $name)
            && $comment->media_path === 'comment-media/'.$name, 404);
        $disk = Storage::disk('local');
        abort_unless($disk->exists($comment->media_path), 404);
        return response()->file($disk->path($comment->media_path), [
            'Content-Type' => match (strtolower(pathinfo($name, PATHINFO_EXTENSION))) {
                'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg',
            }, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function update(Request $request, int $report): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['reviewed', 'dismissed'])]]);
        abort_unless(DB::table('post_reports')->where('id', $report)->exists(), 404);
        DB::table('post_reports')->where('id', $report)->where('status', 'pending')->update([
            'status' => $data['status'], 'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(), 'updated_at' => now(),
        ]);
        return back()->with('status', 'Report updated.');
    }
}
