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
