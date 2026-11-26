<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LearningCourseResource extends Model
{
    protected $fillable = [
        'course_id', 'lesson_uid', 'title', 'section_title', 'description', 'kind', 'url',
        'file_path', 'original_name', 'is_published',
    ];

    protected function casts(): array
    {
        return ['is_published' => 'boolean'];
    }
}
