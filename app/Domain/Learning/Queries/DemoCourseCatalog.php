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

        // Aggregate enrollments once in the catalog query; never fetch learner identities.
        $learnerCounts = DB::table('learning_demo_course_enrollments')
            ->select('course_slug')->selectRaw('COUNT(*) AS learner_count')->groupBy('course_slug');

        return LearningCourse::query()->where('is_published', true)
            ->leftJoinSub($learnerCounts, 'catalog_learners', 'catalog_learners.course_slug', '=', 'learning_courses.slug')
            ->orderBy('learning_courses.sort_order')->orderBy('learning_courses.id')
            ->select(['learning_courses.id', 'learning_courses.slug', 'learning_courses.title', 'learning_courses.summary', 'learning_courses.category', 'learning_courses.level', 'learning_courses.minutes', 'learning_courses.thumbnail', 'learning_courses.cover_path', 'learning_courses.access_tier'])
            ->selectRaw('COALESCE(catalog_learners.learner_count, 0) AS learner_count')
            ->withCount(['reviews as public_review_count' => fn ($query) => $query->where('is_published', true)])
            ->withAvg(['reviews as public_rating' => fn ($query) => $query->where('is_published', true)], 'rating')->get()
            ->map(fn (LearningCourse $course) => [
                ...$course->catalogData(),
                'learnerCount' => (int) $course->getAttribute('learner_count'),
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

    public function findPublished(string $slug, bool $withReviews = false): ?LearningCourse
    {
        $query = LearningCourse::query()->where('slug', $slug)->where('is_published', true);
        if ($withReviews) {
            $query->withCount(['reviews as public_review_count' => fn ($query) => $query->where('is_published', true)])
                ->withAvg(['reviews as public_rating' => fn ($query) => $query->where('is_published', true)], 'rating');
        }
        return $query->first();
    }

    public function detailData(LearningCourse $course): array
    {
        return [
            ...$course->catalogData(),
            'overview' => $course->overview,
            'presentation' => $course->presentationData(),
            'objectives' => $course->objectives ?? [],
            'outline' => $course->outline ?? [],
            'lessons' => $course->lessons ?? [],
        ];
    }
}
