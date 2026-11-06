<?php

namespace App\Domain\Learning\Queries;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Read-only demo catalog; at most one enrollment and one bookmark lookup per member. */
final class DemoCourseCatalog
{
    public function all(?User $user): array
    {
        $enrolled = $user ? DB::table('learning_demo_course_enrollments')
            ->where('user_id', $user->id)->pluck('course_slug')->flip() : collect();
        $saved = $user ? DB::table('learning_demo_course_saves')
            ->where('user_id', $user->id)->pluck('course_slug')->flip() : collect();

        return collect(config('demo-learning-courses.courses', []))->map(fn (array $course) => [
            ...collect($course)->except('lessons')->all(),
            'enrolled' => $enrolled->has($course['slug']),
            'saved' => $saved->has($course['slug']),
        ])->all();
    }

    public function find(string $slug): ?array
    {
        return collect(config('demo-learning-courses.courses', []))
            ->firstWhere('slug', $slug);
    }
}
