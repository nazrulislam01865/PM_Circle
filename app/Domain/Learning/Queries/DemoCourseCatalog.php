<?php

namespace App\Domain\Learning\Queries;

use App\Models\LearningCourse;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Database-backed catalog, retaining existing routes and member enrollment keys. */
final class DemoCourseCatalog
{
    public function all(?User $user): array
    {
        $enrolled = $user ? DB::table('learning_demo_course_enrollments')
            ->where('user_id', $user->id)->pluck('course_slug')->flip() : collect();
        $saved = $user ? DB::table('learning_demo_course_saves')
            ->where('user_id', $user->id)->pluck('course_slug')->flip() : collect();

        return LearningCourse::query()->where('is_published', true)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['slug', 'title', 'summary', 'category', 'level', 'minutes', 'thumbnail', 'cover_path', 'access_tier'])
            ->map(fn (LearningCourse $course) => [
                ...$course->catalogData(),
                'enrolled' => $enrolled->has($course->slug),
                'saved' => $saved->has($course->slug),
            ])->all();
    }

    /** Minimal lookup for enrollment and bookmarks, without loading course content. */
    public function accessTier(string $slug): ?string
    {
        return LearningCourse::query()->where('slug', $slug)
            ->where('is_published', true)->value('access_tier');
    }

    public function find(string $slug): ?array
    {
        $course = $this->findPublished($slug);

        return $course ? $this->detailData($course) : null;
    }

    public function findPublished(string $slug): ?LearningCourse
    {
        return LearningCourse::query()->where('slug', $slug)->where('is_published', true)->first();
    }

    public function detailData(LearningCourse $course): array
    {
        return [
            ...$course->catalogData(),
            'overview' => $course->overview,
            'objectives' => $course->objectives ?? [],
            'outline' => $course->outline ?? [],
            'lessons' => $course->lessons ?? [],
        ];
    }
}
