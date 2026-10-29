<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = ['author_id', 'title', 'body', 'topic', 'visibility', 'status', 'published_at'];
    protected function casts(): array { return ['published_at' => 'datetime', 'ai_generated' => 'boolean']; }
    public function author(): BelongsTo { return $this->belongsTo(User::class, 'author_id'); }
    public function comments(): HasMany { return $this->hasMany(Comment::class); }
    public function reactions(): HasMany { return $this->hasMany(PostReaction::class); }
    public function saves(): HasMany { return $this->hasMany(PostSave::class); }
}
