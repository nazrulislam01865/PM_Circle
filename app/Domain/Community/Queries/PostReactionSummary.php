<?php

namespace App\Domain\Community\Queries;

use App\Domain\Community\Services\EngagementStats;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/** Attach the seven real reaction counts to a bounded set of posts without N+1 queries. */
final class PostReactionSummary
{
    public static function selectStats(Builder $query, string $alias): Builder
    {
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

        $counts = collect();
        if (! EngagementStats::readsEnabled()) {
            $counts = DB::table('post_reactions')
                ->whereIn('post_id', $posts->pluck('id')->all())
                ->whereIn('type', EngagementStats::TYPES)
                ->select('post_id', 'type')
                ->selectRaw('COUNT(*) AS total')
                ->groupBy('post_id', 'type')
                ->get()->groupBy('post_id');
        }

        foreach ($posts as $post) {
            $values = array_fill_keys(EngagementStats::TYPES, 0);
            if (EngagementStats::readsEnabled()) {
                foreach (EngagementStats::TYPES as $type) {
                    $values[$type] = (int) ($post->getAttribute($type.'_count') ?? 0);
                    $post->makeHidden($type.'_count');
                }
            } else {
                foreach ($counts->get($post->id, collect()) as $row) {
                    $values[$row->type] = (int) $row->total;
                }
            }
            $post->setAttribute('reaction_breakdown', $values);
        }
    }
}
