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
        'lessons', 'is_published', 'sort_order', 'presentation',
        'practice_question_count', 'practice_duration_minutes', 'practice_enabled', 'certificate_enabled',
    ];

    protected function casts(): array
    {
        return [
            'minutes' => 'integer', 'thumbnail' => 'integer',
            'is_published' => 'boolean', 'sort_order' => 'integer',
            'practice_question_count' => 'integer', 'practice_duration_minutes' => 'integer',
            'practice_enabled' => 'boolean', 'certificate_enabled' => 'boolean',
            'presentation' => 'array', 'objectives' => 'array', 'outline' => 'array', 'lessons' => 'array',
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

    public function reviews(): HasMany
    {
        return $this->hasMany(LearningCourseReview::class, 'course_id');
    }

    public function presentationData(): array
    {
        $exam = preg_match('/\b(?:exams?|certification|pmp)\b/i', $this->title.' '.$this->category) === 1;
        return array_replace([
            'type' => $exam ? 'Certification preparation' : 'Professional development',
            'tags' => $this->slug === 'pmp-exam-preparation' ? ['PMP®', 'Exam Preparation'] : ($exam ? ['Exam Preparation'] : []),
            'provider_name' => 'PM Circle by ITQAN',
            'provider_description' => 'Project management learning and exam preparation resources.',
            'faq' => [],
            'practice_examples' => $this->slug === 'pmp-exam-preparation' ? [
                ['question' => 'What should you do if a sponsor requests a scope change just before release?', 'answer' => 'Check the impact on schedule, risk, and value. Then follow the agreed change process and communicate the decision.'],
                ['question' => 'How should you respond when two team members disagree on priorities?', 'answer' => 'Understand each person’s concerns and facilitate a decision based on shared project goals.'],
            ] : [],
        ], $this->presentation ?? []);
    }

    /** Public card data; never include enrollment-restricted lesson bodies. */
    public function catalogData(): array
    {
        $attributes = $this->getAttributes();
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
            'rating' => isset($attributes['public_rating']) ? round((float) $attributes['public_rating'], 1) : null,
            'reviewCount' => (int) ($attributes['public_review_count'] ?? 0),
        ];
    }
}
