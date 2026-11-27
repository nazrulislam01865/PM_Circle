<?php

namespace App\Domain\Community\Actions;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Post;
use App\Models\User;
use App\Support\Community\ReactionIconCatalog;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

final class ReactToPost
{
    /** Desired-state operation: null removes a reaction, repeat requests make no change. */
    public function execute(User $user, Post $post, ?string $type, bool $includeBreakdown = false): int|array
    {
        if ($type !== null && ! in_array($type, ReactionIconCatalog::activeTypes(), true)) {
            throw new InvalidArgumentException('Unsupported post reaction type.');
        }
        return DB::transaction(function () use ($user, $post, $type, $includeBreakdown): int|array {
            EngagementStats::lockReaction($user->id);
            $old = DB::table('post_reactions')->where('post_id', $post->id)
                ->where('user_id', $user->id)->value('type');

            if ($old !== $type) {
                if ($type === null) {
                    DB::table('post_reactions')->where('post_id', $post->id)
                        ->where('user_id', $user->id)->delete();
                } elseif ($old === null) {
                    DB::table('post_reactions')->insert([
                        'post_id' => $post->id, 'user_id' => $user->id, 'type' => $type,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                } else {
                    DB::table('post_reactions')->where('post_id', $post->id)
                        ->where('user_id', $user->id)->update(['type' => $type, 'updated_at' => now()]);
                }
                EngagementStats::applyReaction($post->id, $old, $type);
                if ($old === null && $type !== null) {
                    DB::afterCommit(static fn () => app(\App\Domain\Notifications\ActivityNotifier::class)
                        ->forPostReaction($user, $post));
                }
            }

            if ($includeBreakdown) {
                $breakdown = array_fill_keys(ReactionIconCatalog::allTypes(), 0);
                $reads = EngagementStats::readsEnabled();
                $stats = $reads ? DB::table('post_engagement_stats')->where('post_id', $post->id)->first() : null;
                if ($stats) {
                    foreach (EngagementStats::TYPES as $reaction) {
                        $breakdown[$reaction] = (int) $stats->{$reaction.'_count'};
                    }
                }
                if (! $stats || (int) $stats->other_reactions_count > 0) {
                    $rows = DB::table('post_reactions')->where('post_id', $post->id)
                        ->when($stats !== null, fn ($query) => $query->whereNotIn('type', EngagementStats::TYPES))
                        ->groupBy('type')->selectRaw('type, COUNT(*) AS total')->pluck('total', 'type');
                    foreach ($rows as $reaction => $total) $breakdown[$reaction] = (int) $total;
                }
                return ['reaction' => $type, 'count' => array_sum($breakdown), 'breakdown' => $breakdown];
            }

            return EngagementStats::readsEnabled()
                ? (int) DB::table('post_engagement_stats')->where('post_id', $post->id)->value('reactions_count')
                : (int) DB::table('post_reactions')->where('post_id', $post->id)->count();
        }, 3);
    }
}
