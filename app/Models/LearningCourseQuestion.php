<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LearningCourseQuestion extends Model
{
    protected $fillable = [
        'course_id', 'code', 'section_title', 'topic_title', 'kind', 'difficulty',
        'lesson_uid', 'scenario_text', 'scenario_video_url', 'prompt', 'options', 'correct_option', 'explanation', 'is_published',
    ];

    protected function casts(): array
    {
        return ['options' => 'array', 'is_published' => 'boolean'];
    }
}
