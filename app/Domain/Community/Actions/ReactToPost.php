<?php

namespace App\Domain\Community\Actions;

use App\Domain\Community\Services\EngagementStats;
use App\Models\Post;
use App\Models\User;
use App\Support\Community\ReactionIconCatalog;
use App\Domain\Community\Queries\PostReactionSummary;
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
            $post = EngagementStats::lockAccessiblePost($post->id, $user);
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
                $summary = PostReactionSummary::forPost($post->id);
                return ['post_id' => $post->id, 'reaction' => $type, 'count' => array_sum($summary['counts']),
                    'breakdown' => $summary['counts'], 'reaction_breakdown' => $summary['counts'], 'version' => $summary['version']];
            }
            $total = EngagementStats::readsEnabled() ? DB::table('post_engagement_stats')->where('post_id', $post->id)->value('reactions_count') : null;
            return $total === null ? DB::table('post_reactions')->where('post_id', $post->id)->count() : (int) $total;
        }, 3);
    }
}
