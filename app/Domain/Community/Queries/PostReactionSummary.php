<?php

namespace App\Domain\Community\Queries;

use App\Domain\Community\Services\EngagementStats;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Resolve reaction breakdowns for a batch of posts without N+1 queries. */
final class PostReactionSummary
{
    public static function selectStats(Builder $query, string $alias): Builder
    {
        // Only the seven built-ins have dedicated materialized columns.
        foreach (EngagementStats::TYPES as $type) {
            $query->selectRaw("COALESCE({$alias}.{$type}_count, 0) AS {$type}_count");
        }

        return $query;
    }

    /** @param Collection<int, \App\Models\Post> $posts */
    public static function attach(Collection $posts): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $reads = EngagementStats::readsEnabled();
        $allTypes = ReactionIconCatalog::allTypes();
        $extraTypes = array_keys(ReactionIconCatalog::custom());
        $counts = collect();
        if (! $reads || $extraTypes !== []) {
            $counts = DB::table('post_reactions')
                ->whereIn('post_id', $posts->pluck('id')->all())
                ->whereIn('type', $reads ? $extraTypes : $allTypes)
                ->select('post_id', 'type')
                ->selectRaw('COUNT(*) AS total')
                ->groupBy('post_id', 'type')
                ->get()->groupBy('post_id');
        }

        foreach ($posts as $post) {
            $values = array_fill_keys($allTypes, 0);
            if ($reads) {
                foreach (EngagementStats::TYPES as $type) {
                    $values[$type] = (int) ($post->getAttribute($type.'_count') ?? 0);
                    $post->makeHidden($type.'_count');
                }
            }
            foreach ($counts->get($post->id, collect()) as $row) {
                $values[$row->type] = (int) $row->total;
            }
            $post->setAttribute('reaction_breakdown', $values);
        }
    }
}
