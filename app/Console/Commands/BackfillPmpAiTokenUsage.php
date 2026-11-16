<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** One-off, idempotent reconstruction of historical provider tokens from completed PMP requests. */
final class BackfillPmpAiTokenUsage extends Command
{
    protected $signature = 'pm-ai:backfill-pmp-tokens {--dry-run : Read without updating balances}';

    protected $description = 'Reconcile existing PMP AI token usage buckets from verified completed requests';

    public function handle(): int
    {
        $updated = 0;
        $scanned = 0;
        DB::table('ai_chat_usage_buckets')->where('scope_key', 'feature:pmp')
            ->where('window_kind', 'cycle')->orderBy('id')->chunkById(200, function ($buckets) use (&$scanned, &$updated): void {
                foreach ($buckets as $bucket) {
                    $scanned++;
                    DB::transaction(function () use ($bucket, &$updated): void {
                        $locked = DB::table('ai_chat_usage_buckets')->where('id', $bucket->id)
                            ->lockForUpdate()->first();
                        if (! $locked) {
                            return;
                        }
                        $total = (int) DB::table('ai_requests')
                            ->where('user_id', $locked->user_id)
                            ->whereIn('feature_code', ['pmp_explain', 'pmp_followup'])
                            ->where('status', 'completed')
                            ->where('created_at', '>=', $locked->window_start_utc)
                            ->where('created_at', '<', $locked->window_end_utc)
                            ->selectRaw('COALESCE(SUM(input_tokens + output_tokens), 0) as total')
                            ->value('total');
                        if ($total !== (int) $locked->used_tokens) {
                            $updated++;
                            if (! $this->option('dry-run')) {
                                DB::table('ai_chat_usage_buckets')->where('id', $locked->id)
                                    ->update(['used_tokens' => $total, 'version' => $locked->version + 1]);
                            }
                        }
                    }, 3);
                }
            });
        $this->info("PMP cycle token buckets checked: {$scanned}; ".($this->option('dry-run')
            ? 'would update' : 'updated').": {$updated}.");
        return self::SUCCESS;
    }
}
