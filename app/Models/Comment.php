<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Domain\Community\Services\EngagementStats;
use Illuminate\Support\Facades\DB;

class Comment extends Model
{
    use SoftDeletes;

    protected $fillable = ['post_id', 'author_id', 'parent_id', 'body', 'media_path', 'check_status', 'submission_key', 'request_hash'];
    protected $hidden = ['media_path', 'submission_key', 'request_hash', 'check_version', 'engagement_stats_missing'];
    protected $appends = ['media_url'];

    protected function casts(): array
    {
        return ['checked_at' => 'datetime'];
    }

    /** Historic NULL values remain public; only new pending comments are hidden. */
    public function scopeVisible(Builder $query): Builder
    {
        // Eloquent aliases self-relations in existence/count subqueries; qualify against that alias.
        $table = $query->getModel()->getTable();
        return $query->where(fn ($q) => $q->whereNull($table.'.check_status')->orWhere($table.'.check_status', 'approved'))
            ->where(fn ($q) => $q->whereNull($table.'.parent_id')->orWhereExists(fn ($root) => $root
                ->selectRaw('1')->from('comments as visible_root')->whereColumn('visible_root.id', $table.'.parent_id')
                ->whereColumn('visible_root.post_id', $table.'.post_id')->whereNull('visible_root.parent_id')
                ->whereNull('visible_root.deleted_at')->where(fn ($status) => $status->whereNull('visible_root.check_status')->orWhere('visible_root.check_status', 'approved'))));
    }

    /** Materialized totals with a scoped fallback only for missing projections. */
    public function scopeWithEngagement(Builder $query, bool $withReplies = false): Builder
    {
        if (! EngagementStats::commentReadsEnabled()) {
            return $query->withCount($withReplies ? ['likes', 'replies' => fn ($q) => $q->visible()] : ['likes']);
        }
        $query->leftJoin('comment_engagement_stats as comment_stats', 'comment_stats.comment_id', '=', 'comments.id')
            ->select('comments.*')
            ->selectRaw('comment_stats.version AS engagement_version, CASE WHEN comment_stats.comment_id IS NULL THEN 1 ELSE 0 END AS engagement_stats_missing')
            ->selectRaw('COALESCE(comment_stats.reactions_count, (SELECT COUNT(*) FROM comment_likes WHERE comment_likes.comment_id = comments.id)) AS likes_count');
        if ($withReplies) {
            $query->selectRaw("COALESCE(comment_stats.replies_count, (SELECT COUNT(*) FROM comments AS reply WHERE reply.parent_id = comments.id AND reply.post_id = comments.post_id AND reply.deleted_at IS NULL AND (reply.check_status IS NULL OR reply.check_status = 'approved'))) AS replies_count");
        }
        return $query;
    }

    protected static function booted(): void
    {
        static::retrieved(function (self $comment): void {
            if (($comment->getAttributes()['engagement_stats_missing'] ?? false)) {
                \Illuminate\Support\Facades\Log::error('Missing comment engagement projection', ['comment_id' => $comment->id]);
            }
        });
    }

    public function isVisible(): bool
    {
        return EngagementStats::locallyVisible($this) && ($this->parent_id === null || self::query()
            ->whereKey($this->parent_id)->where('post_id', $this->post_id)->whereNull('parent_id')->visible()->exists());
    }

    /** Lifecycle writes, including restores and model-based seeders, share one transaction. */
    public function save(array $options = [])
    {
        return DB::transaction(function () use ($options) {
            EngagementStats::assertWritesOpen();
            EngagementStats::lockMember((int) $this->author_id);
            EngagementStats::lockPost((int) $this->post_id);
            $before = $this->exists ? EngagementStats::lockComment($this) : null;
            if ($before && ($this->isDirty('post_id') || $this->isDirty('author_id') || $this->isDirty('parent_id'))) {
                throw new \LogicException('Comment target and author cannot change.');
            }
            if (! $before && $this->parent_id !== null) {
                abort_unless(self::query()->whereKey($this->parent_id)->where('post_id', $this->post_id)
                    ->whereNull('parent_id')->visible()->lockForUpdate()->first(['id']), 422, 'The comment is unavailable for replies.');
            }
            if ($before) {
                // A stale instance must not turn an unchanged field into a new lifecycle transition.
                foreach (['body', 'media_path', 'check_status', 'deleted_at', 'check_version'] as $field) {
                    if (! $this->isDirty($field)) {
                        $this->setAttribute($field, $before->getRawOriginal($field));
                        $this->syncOriginalAttribute($field);
                    }
                }
            }
            if ($before && ($this->isDirty(['body', 'media_path', 'check_status']) || $this->isDirty('deleted_at'))) {
                $this->check_version = (int) $before->check_version + 1;
            }
            $saved = parent::save($options);
            if ($saved) {
                if ($before === null) EngagementStats::ensureComment($this->id);
                EngagementStats::commentTransition($before, $this);
            }
            return $saved;
        });
    }

    public function delete()
    {
        if (! $this->exists) return null;
        return DB::transaction(function () {
            EngagementStats::assertWritesOpen();
            EngagementStats::lockMember((int) $this->author_id);
            EngagementStats::lockPost((int) $this->post_id);
            $before = EngagementStats::lockComment($this);
            $force = $this->isForceDeleting();
            if ($force) {
                $paths = [$before->media_path];
                if ($before->parent_id === null) $paths = array_merge($paths, DB::table('comments')->where('parent_id', $before->id)->whereNotNull('media_path')->pluck('media_path')->all());
                EngagementStats::queueCommentMediaCleanup($paths);
                EngagementStats::commentTransition($before, null);
                if ($before->parent_id === null) DB::table('comments')->where('parent_id', $before->id)->delete();
            }
            $deleted = parent::delete();
            if ($force && ! $deleted) throw new \RuntimeException('Comment deletion did not complete.');
            if ($deleted && ! $force) EngagementStats::commentTransition($before, $this);
            return $deleted;
        });
    }

    public function getMediaUrlAttribute(): ?string
    {
        if (! EngagementStats::locallyVisible($this) || ! $this->media_path) return null;

        return route('posts.comments.media', [
            'post' => $this->post_id,
            'comment' => $this->id,
            'filename' => basename($this->media_path),
        ], false);
    }

    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id'); }
    public function post(): BelongsTo { return $this->belongsTo(Post::class); }
    public function parent(): BelongsTo { return $this->belongsTo(self::class, 'parent_id'); }
    public function likes(): HasMany { return $this->hasMany(CommentLike::class); }
    public function replies(): HasMany { return $this->hasMany(self::class, 'parent_id'); }
}
