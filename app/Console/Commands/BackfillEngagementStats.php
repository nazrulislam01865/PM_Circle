<?php

namespace App\Console\Commands;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Post;
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
                || config('community.engagement_stats_reads')) {
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
                $types = DB::table('post_reactions')->whereIn('post_id', $ids)
                    ->groupBy('post_id', 'type')
                    ->selectRaw('post_id, type, COUNT(*) AS total')->get()->groupBy('post_id');
                $comments = DB::table('comments')->whereIn('post_id', $ids)->whereNull('deleted_at')
                    ->groupBy('post_id')->selectRaw('post_id, COUNT(*) AS total')->pluck('total', 'post_id');
                $existing = DB::table('post_engagement_stats')->whereIn('post_id', $ids)->get()->keyBy('post_id');
                $rows = [];
                foreach ($ids as $id) {
                    $expected = ['post_id' => $id, 'reactions_count' => 0,
                        'comments_count' => (int) ($comments[$id] ?? 0)];
                    foreach (EngagementStats::TYPES as $type) {
                        $expected[$type.'_count'] = 0;
                    }
                    foreach ($types[$id] ?? [] as $reaction) {
                        if (! in_array($reaction->type, EngagementStats::TYPES, true)) {
                            throw new \RuntimeException('Unsupported reaction type detected for post '.$id);
                        }
                        $expected[$reaction->type.'_count'] = (int) $reaction->total;
                        $expected['reactions_count'] += (int) $reaction->total;
                    }
                    if ($verify) {
                        $actual = $existing[$id] ?? null;
                        foreach ($expected as $column => $value) {
                            if (! $actual || (int) $actual->{$column} !== (int) $value) {
                                $mismatches++;
                                if ($mismatches <= 10) {
                                    $this->warn('Mismatch post '.$id.' in '.$column.': expected '.$value.', got '.($actual->{$column} ?? 'missing'));
                                }
                                break;
                            }
                        }
                    } else {
                        $rows[] = [...$expected, 'updated_at' => now()];
                    }
                    $processed++;
                }
                if (! $verify && $rows !== []) {
                    // With engagement writes paused this cannot overwrite a concurrent counter update.
                    DB::transaction(fn () => DB::table('post_engagement_stats')->upsert(
                        $rows,
                        ['post_id'],
                        array_values(array_diff(array_keys($rows[0]), ['post_id'])),
                    ));
                }
            });
            if ($verify) {
                $extraRows = DB::table('post_engagement_stats')->whereNotIn('post_id', function ($query): void {
                    $query->select('id')->from('posts');
                })->count();
                $mismatches += $extraRows;
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
