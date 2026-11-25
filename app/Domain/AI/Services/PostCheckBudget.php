<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** Shared budget admission for post and comment checks across multiple Redis workers. */
final class PostCheckBudget
{
    public function claim(string $table, int $id): bool
    {
        if (! in_array($table, ['post_check_runs', 'comment_check_runs'], true)) {
            throw new RuntimeException('POST_CHECK_INVALID_TABLE');
        }
        $day = now('UTC')->toDateString();
        $credential = app(AiFeatureRouting::class)->primaryAccounting('feed_moderation', 'post_check_api_key');
        return Cache::lock('post-check-budget:'.$day, 10)->block(3, function () use ($table, $id, $day, $credential): bool {
            $run = DB::table($table)->where('id', $id)->first(['status', 'updated_at', 'workspace_accounted', 'error_code']);
            if (! $run) return false;
            if ($run->status === 'running') {
                if (Carbon::parse($run->updated_at)->greaterThan(now()->subMinutes(3))) return false;
                if ($run->workspace_accounted) throw new RuntimeException('POST_CHECK_OUTCOME_UNKNOWN');
            } elseif (! in_array($run->status, ['queued', 'failed'], true)) {
                return false;
            }
            if (in_array($run->error_code, ['POST_CHECK_OUTCOME_UNKNOWN','PROVIDER_STATUS_UNKNOWN','POST_CHECK_INVALID_RESULT','POST_CHECK_REVIEW_INCOMPLETE'], true)) throw new RuntimeException('POST_CHECK_OUTCOME_UNKNOWN');
            // Paid Responses calls reserve the shared global/feature/credential budget in
            // AiDirectUsage immediately before dispatch. Omni never incurs an artificial hold.
            return DB::table($table)->where('id', $id)->where('status', $run->status)
                ->when($run->status === 'running', fn ($query) => $query->where('updated_at', '<=', now()->subMinutes(3)))
                ->update(['status' => 'running', 'error_code' => null, 'credential_ref' => $credential['ref'] ?? null, 'credential_day' => $day, 'updated_at' => now()]) === 1;
        });
    }
}
