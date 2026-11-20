<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LearningCoursePracticeAttempt extends Model
{
    protected $fillable = [
        'course_id', 'user_id', 'section_title', 'questions', 'answers',
        'status', 'score', 'started_at', 'expires_at', 'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'questions' => 'array', 'answers' => 'array',
            'started_at' => 'datetime', 'expires_at' => 'datetime', 'submitted_at' => 'datetime',
        ];
    }
}
