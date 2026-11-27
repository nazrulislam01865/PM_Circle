<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'author_id',
        'title',
        'body',
        'image_path',
        'is_anonymous',
        'topic',
        'tags',
        'claps_count',
        'visibility',
        'status',
        'published_at',
        'check_version',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'claps_count' => 'integer',
            'comments_count' => 'integer',
            'engagement_version' => 'integer',
            'reactions_count' => 'integer',
            'likes_count' => 'integer',
            'loves_count' => 'integer',
            'published_at' => 'datetime',
            'ai_generated' => 'boolean',
            'notifications_muted_at' => 'datetime',
            'is_anonymous' => 'boolean',
            'check_version' => 'integer',
            'checked_at' => 'datetime',
            'restricted_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (self $post): void {
            \App\Domain\Community\Services\EngagementStats::ensureRow($post->id);
        });
    }

    public function save(array $options = [])
    {
        if ($this->exists) return parent::save($options);
        return \Illuminate\Support\Facades\DB::transaction(function () use ($options) {
            \App\Domain\Community\Services\EngagementStats::assertWritesOpen();
            if ($this->author_id) \App\Domain\Community\Services\EngagementStats::lockMember((int) $this->author_id);
            return parent::save($options);
        });
    }

    public function delete()
    {
        return \Illuminate\Support\Facades\DB::transaction(function () {
            \App\Domain\Community\Services\EngagementStats::assertWritesOpen();
            \App\Domain\Community\Services\EngagementStats::lockPost($this->id);
            return parent::delete();
        });
    }

    /** Mask author details before serializing anonymous public posts. */
    public function anonymizeForPublic(): void
    {
        if (! $this->is_anonymous) {
            return;
        }

        $this->setRelation('author', new User(['name' => 'Anonymous member']));
        $this->makeHidden('author_id');
    }

    /**
     * Reuse the same public, published feed for dashboard and community pages.
     * Following includes members the viewer follows and members who follow the viewer.
     * SQL subqueries use indexed member_follows columns without loading follow IDs.
     */
    public function scopeForFeed(Builder $query, string $tab = 'all', ?int $viewerId = null): Builder
    {
        $query->where('posts.status', 'published')
            ->where(function (Builder $visible) use ($viewerId): void {
                $visible->where('posts.visibility', 'public');
                if ($viewerId) $visible->orWhere('posts.visibility', 'members');
            });
        if ($viewerId && $tab === 'hidden') {
            return $query->whereExists(fn ($hidden) => $hidden->selectRaw('1')
                ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                ->where('post_hides.user_id', $viewerId));
        }
        if ($viewerId) {
            $query->whereNotExists(fn ($hidden) => $hidden->selectRaw('1')
                ->from('post_hides')->whereColumn('post_hides.post_id', 'posts.id')
                ->where('post_hides.user_id', $viewerId));
        }
        if ($tab === 'saved' || $tab === 'hidden') {
            return $viewerId ? $query->whereExists(fn ($saves) => $saves->selectRaw('1')
                ->from('post_saves')->whereColumn('post_saves.post_id', 'posts.id')
                ->where('post_saves.user_id', $viewerId)) : $query->whereRaw('1 = 0');
        }

        if ($tab === 'mine') {
            return $viewerId ? $query->where('posts.author_id', $viewerId) : $query->whereRaw('1 = 0');
        }

        if ($tab === 'following') {
            if (! $viewerId) {
                return $query->whereRaw('1 = 0');
            }

            return $query->where(function (Builder $follows) use ($viewerId): void {
                $follows->whereIn('posts.author_id', function ($subquery) use ($viewerId): void {
                    $subquery->select('followed_id')->from('member_follows')->where('follower_id', $viewerId);
                })->orWhereIn('posts.author_id', function ($subquery) use ($viewerId): void {
                    $subquery->select('follower_id')->from('member_follows')->where('followed_id', $viewerId);
                });
            });
        }

        return $query;
    }

    /** Convert legacy /storage/ links to the existing symlink-free media endpoint. */
    protected function imagePath(): Attribute
    {
        return Attribute::make(get: static function (?string $value): ?string {
            if (! $value) {
                return null;
            }

            if (preg_match('~^(?:/?(?:storage/)?post-images/)([A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp))$~iD', $value, $matches)) {
                return '/post-media/'.$matches[1];
            }

            return $value;
        });
    }

    public function pollOptions(): HasMany
    {
        return $this->hasMany(PostPollOption::class)->orderBy('position');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(PostReaction::class);
    }

    public function saves(): HasMany
    {
        return $this->hasMany(PostSave::class);
    }
}
