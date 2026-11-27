<?php

namespace App\Domain\Community\Queries;

use App\Domain\Community\Services\EngagementStats;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Resolve reaction breakdowns for a batch of posts without N+1 queries. */
final class PostReactionSummary
{
    public static function selectStats(Builder $query, string $alias): Builder
    {
        foreach (EngagementStats::TYPES as $type) $query->selectRaw("{$alias}.{$type}_count AS {$type}_count");
        return $query->selectRaw("{$alias}.version AS engagement_version");
    }

    public static function forPost(int $postId): array
    {
        $post = new \App\Models\Post;
        $post->id = $postId;
        if (EngagementStats::readsEnabled() && ! EngagementStats::typeReadsEnabled()) {
            $stats = DB::table('post_engagement_stats')->where('post_id', $postId)->first();
            foreach (EngagementStats::TYPES as $type) $post->setAttribute($type.'_count', $stats->{$type.'_count'} ?? null);
            $post->setAttribute('engagement_version', $stats->version ?? null);
            $post->setAttribute('reactions_count', $stats->reactions_count ?? null);
        }
        self::attach(collect([$post]));
        return ['counts' => $post->reaction_breakdown, 'version' => $post->engagement_version === null ? null : (int) $post->engagement_version];
    }

    public static function attach(Collection $posts): void
    {
        if ($posts->isEmpty()) return;
        $reads = EngagementStats::readsEnabled();
        $typeReads = EngagementStats::typeReadsEnabled();
        $allTypes = ReactionIconCatalog::allTypes();
        $counts = collect();
        $missing = $reads ? $posts->filter(fn ($p) => $p->engagement_version === null)->pluck('id')->all() : [];
        if ($typeReads) {
            // Read totals, version and type breakdown in the same SQL snapshot. This also handles
            // a mutation committed between the feed's post join and this batched lookup.
            $snapshot = DB::table('post_engagement_stats as stats')
                ->leftJoin('post_reaction_counts as types', 'types.post_id', '=', 'stats.post_id')
                ->whereIn('stats.post_id', $posts->pluck('id'))
                ->get(['stats.post_id', 'stats.version', 'stats.reactions_count', 'stats.comments_count', 'stats.like_count', 'stats.love_count',
                    'types.reaction_type as type', 'types.total'])->groupBy('post_id');
            $missing = [];
            foreach ($posts as $post) {
                $rows = $snapshot->get($post->id, collect());
                $stat = $rows->first();
                $typeRows = $rows->filter(fn ($row) => $row->type !== null);
                if (! $stat || (int) $typeRows->sum('total') !== (int) $stat->reactions_count) {
                    $missing[] = $post->id;
                    continue;
                }
                $counts->put($post->id, $typeRows);
                $post->setAttribute('engagement_version', (int) $stat->version);
                $post->setAttribute('reactions_count', (int) $stat->reactions_count);
                $post->setAttribute('comments_count', (int) $stat->comments_count);
                $post->setAttribute('likes_count', (int) $stat->like_count);
                $post->setAttribute('loves_count', (int) $stat->love_count);
            }
        } elseif (! $reads || ReactionIconCatalog::custom() !== []) {
            $counts = DB::table('post_reactions')->whereIn('post_id', $posts->pluck('id'))
                ->when($reads, fn ($q) => $q->whereNotIn('type', EngagementStats::TYPES))
                ->selectRaw('post_id, type, COUNT(*) AS total')->groupBy('post_id', 'type')->get()->groupBy('post_id');
        }
        $fallback = collect();
        if ($missing) {
            $missing = array_values(array_unique($missing));
            Log::error('Missing or mismatched post engagement projection', ['post_ids' => $missing]);
            $fallback = DB::table('post_reactions')->whereIn('post_id', $missing)
                ->selectRaw('post_id, type, COUNT(*) AS total')->groupBy('post_id', 'type')->get()->groupBy('post_id');
            $commentTotals = \App\Models\Comment::query()->visible()->whereIn('post_id', $missing)
                ->selectRaw('post_id, COUNT(*) AS total')->groupBy('post_id')->pluck('total', 'post_id');
        }
        foreach ($posts as $post) {
            $values = array_fill_keys($allTypes, 0);
            $isMissing = in_array($post->id, $missing, true);
            if ($reads && ! $typeReads && ! $isMissing) {
                foreach (EngagementStats::TYPES as $type) $values[$type] = (int) $post->getAttribute($type.'_count');
            }
            $rows = $isMissing ? $fallback->get($post->id, collect()) : $counts->get($post->id, collect());
            foreach ($rows as $row) $values[$row->type] = (int) $row->total;
            if ($isMissing) {
                $post->setAttribute('comments_count', (int) ($commentTotals[$post->id] ?? 0));
                $post->setAttribute('reactions_count', array_sum($values));
                $post->setAttribute('likes_count', $values['like'] ?? 0);
                $post->setAttribute('loves_count', $values['love'] ?? 0);
                $post->setAttribute('engagement_version', null);
            }
            if ($reads) foreach (EngagementStats::TYPES as $type) $post->makeHidden($type.'_count');
            $post->setAttribute('reaction_breakdown', $values);
        }
    }
}
