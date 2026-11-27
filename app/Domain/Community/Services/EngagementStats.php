<?php

namespace App\Domain\Community\Services;

use App\Models\Comment;
use App\Models\Post;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/** The sole writer of engagement projections. Source mutations share its transaction. */
final class EngagementStats
{
    public const TYPES = ['like', 'love', 'care', 'haha', 'wow', 'sad', 'angry'];

    public static function writesEnabled(): bool
    {
        return (bool) config('community.engagement_stats_writes', false);
    }

    public static function readsEnabled(): bool
    {
        return self::writesEnabled() && (bool) config('community.engagement_stats_reads', false);
    }

    public static function typeReadsEnabled(): bool
    {
        return self::readsEnabled() && (bool) config('community.engagement_type_reads', false);
    }

    public static function commentReadsEnabled(): bool
    {
        return self::writesEnabled() && (bool) config('community.engagement_comment_reads', false);
    }

    public static function assertWritesOpen(): void
    {
        abort_if(config('community.engagement_write_gate'), 503, 'Community engagement is temporarily paused.', ['Retry-After' => '60']);
    }

    public static function ensureRow(int $postId): void
    {
        DB::table('post_engagement_stats')->insertOrIgnore(['post_id' => $postId, 'updated_at' => now()]);
    }

    public static function ensureComment(int $commentId): void
    {
        DB::table('comment_engagement_stats')->insertOrIgnore(['comment_id' => $commentId, 'updated_at' => now()]);
    }

    public static function applyReaction(int $postId, ?string $before, ?string $after): void
    {
        if (! self::writesEnabled() || $before === $after) return;
        $increments = ['reactions_count' => (int) ($after !== null) - (int) ($before !== null)];
        $types = [];
        foreach ([[$before, -1], [$after, 1]] as [$type, $delta]) {
            if ($type === null) continue;
            $column = in_array($type, self::TYPES, true) ? $type.'_count' : 'other_reactions_count';
            $increments[$column] = ($increments[$column] ?? 0) + $delta;
            $types[$type] = $delta;
        }
        self::adjust('post_engagement_stats', ['post_id' => $postId], $increments);
        ksort($types);
        foreach ($types as $type => $delta) {
            $key = ['post_id' => $postId, 'reaction_type' => $type];
            if ($delta > 0) {
                DB::table('post_reaction_counts')->upsert(
                    [...$key, 'total' => 1, 'updated_at' => now()],
                    ['post_id', 'reaction_type'],
                    ['total' => DB::raw('post_reaction_counts.total + 1'), 'updated_at']
                );
            } else {
                self::adjust('post_reaction_counts', $key, ['total' => $delta], false);
            }
        }
    }

    public static function applyComment(int $postId, int $delta): void
    {
        if (self::writesEnabled() && $delta !== 0) self::adjust('post_engagement_stats', ['post_id' => $postId], ['comments_count' => $delta]);
    }

    public static function applyCommentReaction(int $commentId, ?string $before, ?string $after): void
    {
        if (self::writesEnabled() && $before !== $after) self::adjust('comment_engagement_stats', ['comment_id' => $commentId], [
            'reactions_count' => (int) ($after !== null) - (int) ($before !== null),
        ]);
    }

    private static function adjust(string $table, array $key, array $changes, bool $version = true): void
    {
        $query = DB::table($table)->where($key);
        $updates = ['updated_at' => now()];
        if ($version) $updates['version'] = DB::raw('version + 1');
        foreach ($changes as $name => $delta) {
            if ($delta === 0) continue;
            $updates[$name] = DB::raw($name.($delta > 0 ? ' + ' : ' - ').abs($delta));
            if ($delta < 0) $query->where($name, '>=', -$delta);
        }
        if ($query->update($updates) !== 1) throw new RuntimeException('Missing or inconsistent engagement projection: '.$table);
    }

    public static function lockMember(int $userId): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ['pm-circle:engagement-member:'.$userId]);
        } elseif (DB::getDriverName() !== 'sqlite') {
            throw new RuntimeException('Engagement writes require PostgreSQL.');
        }
    }

    public static function lockReaction(int $userId): void { self::lockMember($userId); }

    public static function lockPost(int $postId): Post
    {
        return Post::withTrashed()->whereKey($postId)->lockForUpdate()->firstOrFail();
    }

    public static function lockAccessiblePost(int $postId, User $viewer): Post
    {
        self::assertWritesOpen();
        $post = self::lockPost($postId);
        abort_unless(! $post->trashed() && $post->status === 'published' && ($post->visibility === 'public' ||
            ($post->visibility === 'members' && $viewer->onboarding_step >= 3 && $viewer->status === 'active' && ! $viewer->is_admin && $viewer->hasVerifiedEmail())), 404);
        abort_if(DB::table('post_hides')->where('post_id', $postId)->where('user_id', $viewer->id)->exists(), 404);
        return $post;
    }

    public static function commentSummary(int $id): array
    {
        $stats = self::commentReadsEnabled() ? DB::table('comment_engagement_stats')->where('comment_id', $id)->first() : null;
        if ($stats) return ['count' => (int) $stats->reactions_count, 'replies_count' => (int) $stats->replies_count, 'version' => (int) $stats->version];
        if (self::commentReadsEnabled()) \Illuminate\Support\Facades\Log::error('Missing comment engagement projection', ['comment_id' => $id]);
        return ['count' => DB::table('comment_likes')->where('comment_id', $id)->count(),
            'replies_count' => Comment::query()->visible()->where('parent_id', $id)->count(), 'version' => null];
    }

    /** Lock target and root in ID order; caller already holds member and post locks. */
    public static function lockComment(Comment $comment): Comment
    {
        $ids = array_filter([$comment->id, $comment->parent_id]);
        $rows = Comment::withTrashed()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        return $rows->get($comment->id) ?? abort(404);
    }

    public static function locallyVisible(?Comment $comment): bool
    {
        return $comment !== null && ! $comment->trashed() && ($comment->check_status === null || $comment->check_status === 'approved');
    }

    /** Apply only the changed contribution; scan a root's children only when root visibility changes. */
    public static function commentTransition(?Comment $before, ?Comment $after): void
    {
        if (! self::writesEnabled()) return;
        $target = $after ?? $before;
        $delta = (int) self::locallyVisible($after) - (int) self::locallyVisible($before);
        if (! $delta) return;
        if ($target->parent_id !== null) {
            if (! Comment::query()->whereKey($target->parent_id)->where('post_id', $target->post_id)->whereNull('parent_id')->visible()->exists()) return;
            self::applyComment($target->post_id, $delta);
            self::adjust('comment_engagement_stats', ['comment_id' => $target->parent_id], ['replies_count' => $delta]);
            return;
        }
        // New roots cannot have replies. Existing roots may hide/restore their entire branch.
        $replies = $before === null ? 0 : Comment::query()->where('parent_id', $target->id)->where('post_id', $target->post_id)
            ->where(fn ($q) => $q->whereNull('check_status')->orWhere('check_status', 'approved'))->count();
        self::applyComment($target->post_id, $delta * (1 + $replies));
        if ($replies && $after !== null) self::adjust('comment_engagement_stats', ['comment_id' => $target->id], ['replies_count' => $delta * $replies]);
    }

    /** Before account cascade, remove dependent replies and capture surviving targets under post locks. */
    public static function prepareMemberDeletion(int $userId): array
    {
        self::assertWritesOpen();
        self::lockMember($userId);
        $ownedPosts = DB::table('posts')->where('author_id', $userId)->pluck('id');
        $ids = $ownedPosts
            ->merge(DB::table('post_reactions')->where('user_id', $userId)->pluck('post_id'))
            ->merge(DB::table('comments')->where('author_id', $userId)->pluck('post_id'))
            ->merge(DB::table('comment_likes')->join('comments', 'comments.id', '=', 'comment_likes.comment_id')->where('comment_likes.user_id', $userId)->pluck('comments.post_id'))
            ->unique()->sort(SORT_NUMERIC)->values()->all();
        if ($ids) DB::table('posts')->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get(['id']);
        $roots = DB::table('comments')->where('author_id', $userId)->whereNull('parent_id')->select('id');
        $paths = DB::table('comments')->whereNotNull('media_path')->where(fn ($q) => $q
            ->where('author_id', $userId)->orWhereIn('parent_id', clone $roots)->orWhereIn('post_id', $ownedPosts))->pluck('media_path')->all();
        self::queueCommentMediaCleanup($paths);
        DB::table('comments')->whereIn('parent_id', $roots)->delete();
        $ids = array_values(array_diff($ids, $ownedPosts->all()));
        return $ids;
    }

    public static function queueCommentMediaCleanup(array $paths): void
    {
        $paths = array_values(array_unique(array_filter($paths)));
        foreach (array_chunk($paths, 100) as $batch) {
            DB::afterCommit(static function () use ($batch): void {
                try {
                    \App\Domain\Community\Jobs\DeleteCommentMedia::dispatch($batch)->onQueue(config('community.media_variants_queue', 'default'));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('Comment media cleanup could not be queued', ['count' => count($batch)]);
                }
            });
        }
    }

    /** Compatibility entry point: delete through this service's transaction, not standalone counter adjustments. */
    public static function beforeMemberDeletion(int $userId): void
    {
        $ids = self::prepareMemberDeletion($userId);
        // Explicitly remove the member's interaction rows before the caller deletes the account.
        DB::table('comment_likes')->where('user_id', $userId)->delete();
        DB::table('post_reactions')->where('user_id', $userId)->delete();
        DB::table('comments')->where('author_id', $userId)->whereNotNull('parent_id')->delete();
        DB::table('comments')->where('author_id', $userId)->delete();
        if (self::writesEnabled()) {
            foreach (array_chunk($ids, 100) as $chunk) EngagementReconciliation::process($chunk, false);
        }
    }
}
