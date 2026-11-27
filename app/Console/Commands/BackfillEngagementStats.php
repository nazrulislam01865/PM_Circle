<?php

namespace App\Console\Commands;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Post;
use App\Domain\Community\Services\EngagementReconciliation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

final class BackfillEngagementStats extends Command
{
    protected $signature = 'community:backfill-engagement-stats
        {--verify : Check all stored counters against authoritative relationships without writing}
        {--chunk=200 : Maximum number of posts checked per batch}
        {--force : Acknowledge gated writes in production}';

    protected $description = 'Backfill or verify materialized post-engagement counters under a gated write cutover';

    public function handle(): int
    {
        $verify = (bool) $this->option('verify');
        $chunk = (int) $this->option('chunk');
        if ($chunk < 10 || $chunk > 1000) {
            $this->error('--chunk must be between 10 and 1000.');
            return self::FAILURE;
        }
        if (! $verify) {
            if (! config('community.engagement_write_gate') || EngagementStats::writesEnabled()
                || config('community.engagement_stats_reads') || config('community.engagement_type_reads') || config('community.engagement_comment_reads')) {
                $this->error('Backfill requires the engagement write gate ON and both statistics switches OFF.');
                return self::FAILURE;
            }
            if (app()->environment('production') && ! $this->option('force')) {
                $this->error('Production backfill requires --force after confirming all application workers use the write gate.');
                return self::FAILURE;
            }
        }

        $processed = 0;
        $mismatches = 0;
        try {
            Post::withTrashed()->select('id')->chunkById($chunk, function ($posts) use ($verify, &$processed, &$mismatches): void {
                $ids = $posts->pluck('id')->all();
                $mismatches += DB::transaction(function () use ($ids, $verify): int {
                    DB::table('posts')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get(['id']);
                    return EngagementReconciliation::process($ids, $verify);
                }, 3);
                $processed += count($ids);
            });
            if ($verify) {
                $extraRows = DB::table('post_engagement_stats')->whereNotIn('post_id', function ($query): void {
                    $query->select('id')->from('posts');
                })->count();
                $mismatches += $extraRows;
                $mismatches += DB::table('post_reaction_counts')->whereNotIn('post_id', DB::table('posts')->select('id'))->count();
                $mismatches += DB::table('comment_engagement_stats')->whereNotIn('comment_id', DB::table('comments')->select('id'))->count();
            }
        } catch (Throwable $exception) {
            $this->error('Engagement statistics processing stopped: '.$exception->getMessage());
            return self::FAILURE;
        }

        $this->info(($verify ? 'Verified' : 'Backfilled').' '.$processed.' posts; mismatches: '.$mismatches.'.');
        if ($verify && $mismatches) {
            return self::FAILURE;
        }
        if (! $verify) {
            $this->warn('Keep writes gated and run this command with --verify before enabling counter writes or reads.');
        }
        return self::SUCCESS;
    }
}
