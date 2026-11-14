<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    use SoftDeletes;
    protected $fillable = ['post_id', 'author_id', 'parent_id', 'body', 'media_path'];
    protected $hidden = ['media_path'];
    protected $appends = ['media_url'];

    private bool $wasActiveBeforeDeletion = false;
    private bool $wasDeletedBeforeRestore = false;

    protected static function booted(): void
    {
        static::created(fn (self $comment) =>
            \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, 1));
        static::deleting(function (self $comment): void {
            $comment->wasActiveBeforeDeletion = $comment->deleted_at === null;
        });
        static::deleted(function (self $comment): void {
            if ($comment->wasActiveBeforeDeletion) {
                \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, -1);
            }
        });
        static::restoring(function (self $comment): void {
            $comment->wasDeletedBeforeRestore = $comment->deleted_at !== null;
        });
        static::restored(function (self $comment): void {
            if ($comment->wasDeletedBeforeRestore) {
                \App\Domain\Community\Services\EngagementStats::applyComment($comment->post_id, 1);
            }
        });
    }


    public function getMediaUrlAttribute(): ?string
    {
        if (! $this->media_path) return null;

        return route('posts.comments.media', [
            'post' => $this->post_id,
            'comment' => $this->id,
            'filename' => basename($this->media_path),
        ], false);
    }
    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id'); }
    public function post(): BelongsTo { return $this->belongsTo(Post::class); }
    public function likes(): HasMany { return $this->hasMany(CommentLike::class); }
    public function replies(): HasMany { return $this->hasMany(self::class, 'parent_id'); }
}
