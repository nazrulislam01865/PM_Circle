<?php

namespace App\Domain\AI\Jobs;

use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\AI\Services\PostCheckBudget;
use App\Domain\AI\Services\CommunitySafetySignals;
use App\Domain\Community\Services\PostCheckMedia;
use App\Domain\Community\Services\PostCheckPolicy;
use App\Models\Post;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Throwable;

final class CheckCommunityPost implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 90;
    public array $backoff = [15, 60, 180];

    public function __construct(public int $postId, public int $version) {}

    public function handle(PostContentCheckService $checker, PostCheckMedia $media, PostCheckPolicy $policy): void
    {
        $post = Post::query()->find($this->postId);
        if (! $post || $post->status !== 'pending_check' || $post->check_version !== $this->version) return;
        $run = DB::table('post_check_runs')->where('post_id', $post->id)->where('check_version', $this->version)->first();
        if (! $run) return;
        $claimed = app(PostCheckBudget::class)->claim('post_check_runs', $run->id);
        if (! $claimed) return;
        try {
            [$bytes, $mime] = $media->bytes($post);
            $pollOptions = $post->topic === 'Poll' ? DB::table('post_poll_options')
                ->where('post_id', $post->id)->orderBy('position')->pluck('label')->all() : [];
            $reviewText = $post->body.($pollOptions ? "\nPoll choices: ".implode(' | ', $pollOptions) : '');
            $signals = app(CommunitySafetySignals::class)->forText($reviewText, $post->author_id, $post->id);
            $result = $checker->inspect($reviewText, $bytes, $mime, ['signals' => $signals]);
            $cost = round(($result['input_tokens'] * 0.05 + $result['output_tokens'] * 0.40) / 1000000, 8);
            $oldUrl = null;
            $applied = DB::transaction(function () use ($post, $media, $policy, $result, $run, $cost, &$oldUrl): bool {
                $locked = Post::query()->whereKey($post->id)->lockForUpdate()->first();
                if (! $locked || $locked->status !== 'pending_check' || $locked->check_version !== $this->version) return false;
                if ($result['violates']) {
                    $locked->forceFill([
                        'status' => 'restricted', 'published_at' => null,
                        'check_category' => $result['category'], 'check_target' => $result['target'],
                        'check_reason' => $result['reason'], 'checked_at' => now(), 'restricted_at' => now(),
                    ])->save();
                    $policy->recordViolation($locked->id, $this->version, $locked->author_id, $result['category']);
                } elseif ($result['needs_review']) {
                    $locked->forceFill([
                        'status' => 'pending_review', 'published_at' => null,
                        'check_category' => $result['category'], 'check_target' => $result['target'],
                        'check_reason' => $result['reason'], 'checked_at' => now(), 'restricted_at' => null,
                    ])->save();
                } else {
                    $oldUrl = $locked->getRawOriginal('image_path');
                    $media->approve($locked);
                    $locked->forceFill([
                        'status' => $locked->is_anonymous ? 'pending_review' : 'published',
                        'published_at' => $locked->is_anonymous ? null : now(),
                        'check_category' => null, 'check_target' => null, 'check_reason' => null,
                        'checked_at' => now(), 'restricted_at' => null,
                    ])->save();
                }
                DB::table('post_check_runs')->where('id', $run->id)->update([
                    'status' => 'completed', 'input_tokens' => $result['input_tokens'],
                    'output_tokens' => $result['output_tokens'], 'cost_usd' => $cost,
                    'updated_at' => now(),
                ]);
                return true;
            }, 3);
            if ($applied && $oldUrl && ! $result['violates']) $media->cleanupApproved($post, $oldUrl);
        } catch (Throwable $exception) {
            DB::table('post_check_runs')->where('id', $run->id)->update([
                'status' => 'failed', 'error_code' => mb_substr($exception->getMessage(), 0, 40), 'updated_at' => now(),
            ]);
            throw $exception;
        }
    }

    public function failed(?Throwable $exception): void
    {
        Post::query()->whereKey($this->postId)->where('status', 'pending_check')
            ->where('check_version', $this->version)
            ->update(['status' => 'check_error', 'check_reason' => 'We could not check your post right now. Please try again.']);
    }
}
