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
        return Cache::lock('post-check-budget:'.$day, 10)->block(3, function () use ($table, $id, $day): bool {
            $run = DB::table($table)->where('id', $id)->first(['status', 'updated_at']);
            if (! $run) return false;
            if ($run->status === 'running') {
                if (Carbon::parse($run->updated_at)->greaterThan(now()->subMinutes(3))) return false;
            } elseif (! in_array($run->status, ['queued', 'failed'], true)) {
                return false;
            }
            // OpenAI's Omni Moderations API is free; do not charge an artificial
            // $0.02 reservation or block checking because a Responses budget is zero.
            if (config('pm-ai.post_check_provider', 'responses') === 'responses') {
                $limit = (float) config('pm-ai.post_check_daily_budget_usd', 0);
                $start = Carbon::parse($day, 'UTC')->startOfDay();
                $end = $start->copy()->addDay();
                $spent = 0.0;
                foreach (['post_check_runs', 'comment_check_runs'] as $source) {
                    $spent += (float) DB::table($source)
                        ->where('created_at', '>=', $start)->where('created_at', '<', $end)
                        ->selectRaw('SUM(CASE WHEN status = ? THEN 0.02 ELSE COALESCE(cost_usd, 0) END) AS total', ['running'])
                        ->value('total');
                }
                if ($limit < 0.02 || $spent + 0.02 > $limit + 0.00000001) {
                    throw new RuntimeException('POST_CHECK_BUDGET_EXCEEDED');
                }
            }
            return DB::table($table)->where('id', $id)->where('status', $run->status)
                ->when($run->status === 'running', fn ($query) => $query->where('updated_at', '<=', now()->subMinutes(3)))
                ->update(['status' => 'running', 'error_code' => null, 'updated_at' => now()]) === 1;
        });
    }
}
