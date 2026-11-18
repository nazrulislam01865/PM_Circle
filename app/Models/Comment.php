<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use SoftDeletes;

    protected $fillable = ['post_id', 'author_id', 'parent_id', 'body', 'media_path', 'check_status'];
    protected $hidden = ['media_path'];
    protected $appends = ['media_url'];

    protected function casts(): array
    {
        return ['checked_at' => 'datetime'];
    }

    /** Historic NULL values remain public; only new pending comments are hidden. */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where(fn (Builder $visible) => $visible->whereNull('check_status')
            ->orWhere('check_status', 'approved'));
    }

    public function isVisible(): bool
    {
        return $this->check_status === null || $this->check_status === 'approved';
    }

    private bool $wasActiveBeforeDeletion = false;
    private bool $wasDeletedBeforeRestore = false;

    protected static function booted(): void
    {
        static::created(static function (self $comment): void {
            if ($comment->isVisible()) {
                \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, 1);
            }
        });
        static::deleting(function (self $comment): void {
            $comment->wasActiveBeforeDeletion = $comment->deleted_at === null && $comment->isVisible();
        });
        static::deleted(function (self $comment): void {
            if ($comment->wasActiveBeforeDeletion) {
                \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, -1);
            }
        });
        static::restoring(function (self $comment): void {
            $comment->wasDeletedBeforeRestore = $comment->deleted_at !== null && $comment->isVisible();
        });
        static::restored(function (self $comment): void {
            if ($comment->wasDeletedBeforeRestore) {
                \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, 1);
            }
        });
    }

    public function getMediaUrlAttribute(): ?string
    {
        if (! $this->isVisible() || ! $this->media_path) return null;

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
