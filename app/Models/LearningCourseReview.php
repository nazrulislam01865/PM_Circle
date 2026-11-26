<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

final class LearningCourseReview extends Model
{
    protected $fillable = ['course_id', 'user_id', 'rating', 'body', 'is_published'];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'is_published' => 'boolean'];
    }
}
