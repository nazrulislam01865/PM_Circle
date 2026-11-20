<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

final class LearningCourse extends Model
{
    protected $fillable = [
        'slug', 'title', 'summary', 'overview', 'category', 'level', 'minutes',
        'thumbnail', 'cover_path', 'access_tier', 'objectives', 'outline',
        'lessons', 'is_published', 'sort_order',
        'practice_question_count', 'practice_duration_minutes', 'practice_enabled',
    ];

    protected function casts(): array
    {
        return [
            'minutes' => 'integer', 'thumbnail' => 'integer',
            'is_published' => 'boolean', 'sort_order' => 'integer',
            'practice_question_count' => 'integer', 'practice_duration_minutes' => 'integer',
            'practice_enabled' => 'boolean',
            'objectives' => 'array', 'outline' => 'array', 'lessons' => 'array',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(LearningCourseQuestion::class, 'course_id');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(LearningCourseResource::class, 'course_id');
    }

    /** Public card data; never include enrollment-restricted lesson bodies. */
    public function catalogData(): array
    {
        return [
            'slug' => $this->slug,
            'title' => $this->title,
            'summary' => $this->summary,
            'category' => $this->category,
            'level' => $this->level,
            'minutes' => $this->minutes,
            'thumbnail' => $this->thumbnail,
            'coverUrl' => $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null,
            'accessTier' => $this->access_tier,
        ];
    }
}
