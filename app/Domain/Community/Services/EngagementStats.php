<?php

namespace App\Domain\Community\Services;

use App\Support\Community\ReactionIconCatalog;
use Illuminate\Support\Facades\DB;
use RuntimeException;

final class EngagementStats
{
    public const TYPES = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

    public static function writesEnabled(): bool
    {
        return (bool) config('community.engagement_stats_writes', false);
    }

    public static function readsEnabled(): bool
    {
        // Never serve stale statistics while old (non-counter) writers are configured.
        return self::writesEnabled() && (bool) config('community.engagement_stats_reads', false);
    }

    public static function ensureRow(int $postId): void
    {
        if (! self::writesEnabled() && ! config('community.engagement_write_gate', false)) {
            return;
        }

        DB::table('post_engagement_stats')->insertOrIgnore([
            'post_id' => $postId, 'updated_at' => now(),
        ]);
    }

    /** Must be called inside the mutation transaction. */
    public static function applyReaction(int $postId, ?string $before, ?string $after): void
    {
        if (! self::writesEnabled() || $before === $after) {
            return;
        }

        $increments = [];
        if ($before === null) {
            $increments['reactions_count'] = 1;
        } elseif ($after === null) {
            $increments['reactions_count'] = -1;
        }
        if ($before !== null) {
            $column = in_array($before, self::TYPES, true) ? $before.'_count' : 'other_reactions_count';
            $increments[$column] = ($increments[$column] ?? 0) - 1;
        }
        if ($after !== null) {
            $column = in_array($after, self::TYPES, true) ? $after.'_count' : 'other_reactions_count';
            $increments[$column] = ($increments[$column] ?? 0) + 1;
        }

        self::updateCounters($postId, $increments);
    }

    /** Count all active root comments and replies; must run inside the caller's transaction. */
    public static function applyComment(int $postId, int $delta): void
    {
        if (self::writesEnabled() && $delta !== 0) {
            self::updateCounters($postId, ['comments_count' => $delta]);
        }
    }

    private static function updateCounters(int $postId, array $changes): void
    {
        $updates = ['updated_at' => now()];
        foreach ($changes as $name => $delta) {
            if ($delta === 0) {
                continue;
            }
            // Column names come exclusively from the server-owned reaction vocabulary.
            $updates[$name] = DB::raw($name.($delta > 0 ? ' + ' : ' - ').abs((int) $delta));
        }
        $query = DB::table('post_engagement_stats')->where('post_id', $postId);
        foreach ($changes as $name => $delta) {
            if ($delta < 0) $query->where($name, '>=', -$delta);
        }
        $affected = $query->update($updates);
        if ($affected !== 1) {
            throw new RuntimeException('Post engagement statistics are missing. Verify the backfill before opening writes.');
        }
    }

    /** Serialize all engagement writes by one member, including account deletion cascades. */
    public static function lockMember(int $userId): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', [
                'pm-circle:engagement-member:'.$userId,
            ]);
        } elseif (DB::getDriverName() !== 'sqlite') {
            throw new RuntimeException('Engagement writes require PostgreSQL.');
        }
    }

    /** One member is serialized across post/comment reactions; no absent-row race. */
    public static function lockReaction(int $userId): void
    {
        self::lockMember($userId);
    }

    /** Adjust survivor posts before FK cascades remove an account's reactions and comments. */
    public static function beforeMemberDeletion(int $userId): void
    {
        if (! self::writesEnabled()) {
            return;
        }

        // The caller locks the member and performs this adjustment and delete in ONE transaction.
        $reactions = DB::table('post_reactions as reactions')
            ->join('posts', 'posts.id', '=', 'reactions.post_id')
            ->where('reactions.user_id', $userId)->where('posts.author_id', '!=', $userId)
            ->select('reactions.post_id', 'reactions.type')->get();
        $commentCounts = DB::table('comments')
            ->join('posts', 'posts.id', '=', 'comments.post_id')
            ->where('comments.author_id', $userId)->where('posts.author_id', '!=', $userId)
            ->whereNull('comments.deleted_at')
            ->where(fn ($query) => $query->whereNull('comments.check_status')->orWhere('comments.check_status', 'approved'))
            ->groupBy('comments.post_id')
            ->selectRaw('comments.post_id, COUNT(*) AS total')->get();
        $byPost = $reactions->groupBy('post_id');
        $byCommentPost = $commentCounts->keyBy('post_id');
        $postIds = $byPost->keys()->merge($byCommentPost->keys())->unique()->sort(SORT_NUMERIC);
        foreach ($postIds as $postId) {
            foreach ($byPost->get($postId, []) as $reaction) {
                self::applyReaction((int) $postId, $reaction->type, null);
            }
            if ($row = $byCommentPost->get($postId)) {
                self::applyComment((int) $postId, -(int) $row->total);
            }
        }
    }
}
