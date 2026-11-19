<?php

namespace App\Domain\AI\Jobs;

use App\Domain\AI\Services\CommunitySafetySignals;
use App\Domain\AI\Services\PostCheckBudget;
use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\Community\Services\EngagementStats;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Comment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/** Author-only until a completed review approves the comment or reply. */
final class CheckCommunityComment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 90;
    public array $backoff = [15, 60, 180];

    public function __construct(public int $commentId) {}

    public function handle(PostContentCheckService $checker, PostCheckPolicy $policy): void
    {
        $comment = Comment::query()->with(['post:id,body,status', 'parent:id,body,check_status'])
            ->find($this->commentId);
        if (! $comment || $comment->check_status !== 'pending_check') return;
        $run = DB::table('comment_check_runs')->where('comment_id', $comment->id)->first();
        if (! $run || ! app(PostCheckBudget::class)->claim('comment_check_runs', $run->id)) return;

        try {
            $bytes = null;
            $mime = null;
            if ($comment->media_path) {
                $name = basename($comment->media_path);
                if (! preg_match('/\A[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)\z/iD', $name)
                    || $comment->media_path !== 'comment-media/'.$name) {
                    throw new RuntimeException('POST_CHECK_INVALID_IMAGE');
                }
                $disk = Storage::disk('local');
                if (! $disk->exists($comment->media_path)) {
                    throw new RuntimeException('POST_CHECK_IMAGE_MISSING');
                }
                $bytes = $disk->get($comment->media_path);
                $mime = match (strtolower(pathinfo($name, PATHINFO_EXTENSION))) {
                    'png' => 'image/png', 'webp' => 'image/webp', default => 'image/jpeg',
                };
            }
            $signals = app(CommunitySafetySignals::class)
                ->forText($comment->body, $comment->author_id, null, $comment->id);
            $result = $checker->inspect($comment->body, $bytes, $mime, [
                'post_excerpt' => $comment->post?->body ?? '',
                'parent_comment' => $comment->parent?->isVisible() ? $comment->parent->body : '',
                'signals' => $signals,
            ]);
            $cost = round(($result['input_tokens'] * 0.05 + $result['output_tokens'] * 0.40) / 1000000, 8);
            DB::transaction(function () use ($comment, $run, $result, $policy, $cost): void {
                $locked = Comment::query()->whereKey($comment->id)->lockForUpdate()->first();
                if (! $locked || $locked->check_status !== 'pending_check') return;
                if ($result['violates']) {
                    $locked->check_status = 'restricted';
                    $locked->check_reason = $result['reason'];
                    $policy->recordCommentViolation($locked->id, $locked->author_id, $result['category']);
                } elseif ($result['needs_review']) {
                    $locked->check_status = 'pending_review';
                    $locked->check_reason = $result['reason'];
                } else {
                    $locked->check_status = 'approved';
                    $locked->check_reason = null;
                    EngagementStats::applyComment($locked->post_id, 1);
                    DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)
                        ->forComment($locked));
                }
                $locked->checked_at = now();
                $locked->save();
                DB::table('comment_check_runs')->where('id', $run->id)->update([
                    'status' => 'completed', 'input_tokens' => $result['input_tokens'],
                    'output_tokens' => $result['output_tokens'], 'cost_usd' => $cost,
                    'updated_at' => now(),
                ]);
            }, 3);
        } catch (Throwable $exception) {
            DB::table('comment_check_runs')->where('id', $run->id)->update([
                'status' => 'failed', 'error_code' => mb_substr($exception->getMessage(), 0, 40),
                'updated_at' => now(),
            ]);
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        Comment::query()->whereKey($this->commentId)->where('check_status', 'pending_check')
            ->update(['check_status' => 'check_error',
                'check_reason' => 'We could not check your comment. Please try again.']);
    }
}
