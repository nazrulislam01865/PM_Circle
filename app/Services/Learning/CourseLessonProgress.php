<?php

namespace App\Services\Learning;

use App\Models\LearningCourse;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class CourseLessonProgress
{
    /** Content keys survive reorder; changed content must be reviewed again. */
    public function lessons(LearningCourse $course): array
    {
        $occurrences = [];
        return array_map(function (array $lesson) use (&$occurrences): array {
            $placement = array_intersect_key($lesson, array_flip(['uid', 'section_title', 'topic_title', 'faq']));
            $lesson = array_filter(array_replace(['title' => '', 'body' => ''], array_intersect_key($lesson, array_flip([
                'title', 'body', 'video_url', 'takeaway', 'when_to_apply', 'example', 'application', 'references',
            ]))), fn ($value) => is_string($value) && trim($value) !== '');
            $lesson = array_replace(['title' => '', 'body' => ''], $lesson);
            ksort($lesson);
            $hash = hash('sha256', json_encode($lesson, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
            $occurrences[$hash] = ($occurrences[$hash] ?? 0) + 1;
            return [...$lesson, ...$placement, 'key' => hash('sha256', $hash.':'.$occurrences[$hash])];
        }, array_values($course->lessons ?? []));
    }

    public function records(User $user, int $courseId): Collection
    {
        return DB::table('learning_course_lesson_progress')->where('user_id', $user->id)
            ->where('course_id', $courseId)->get()->keyBy('lesson_key');
    }

    public function summary(array $lessons, Collection $records): array
    {
        $completed = 0;
        $next = null;
        $items = [];
        foreach ($lessons as $index => $lesson) {
            $done = (bool) ($records->get($lesson['key'])?->completed_at ?? false);
            $completed += (int) $done;
            if (! $done && $next === null) {
                $next = $index + 1;
            }
            $items[] = ['position' => $index + 1, 'title' => $lesson['title'], 'completed' => $done, 'hasVideo' => ! empty($lesson['video_url'])];
        }
        $total = count($items);
        return ['lessons' => $items, 'completed' => $completed, 'total' => $total,
            'percent' => $total ? (int) floor($completed * 100 / $total) : 0, 'next' => $next ?? 1];
    }

    /** A member can receive only one certificate per course; repeated writes are safe. */
    public function complete(User $user, LearningCourse $course, string $key): array
    {
        return DB::transaction(function () use ($user, $course, $key): array {
            // Serialize completion for the same enrollment; also protect against concurrent course edits.
            $expectedTier = $course->access_tier;
            $course = LearningCourse::query()->whereKey($course->id)->sharedLock()->firstOrFail();
            abort_unless($course->is_published, 403);
            abort_unless($course->access_tier === $expectedTier, 409, 'Course access has changed. Reload the page.');
            $enrollment = DB::table('learning_demo_course_enrollments')->where('user_id', $user->id)
                ->where('course_slug', $course->slug)->lockForUpdate()->first();
            abort_unless($enrollment, 403);
            $lessons = $this->lessons($course);
            abort_unless(in_array($key, array_column($lessons, 'key'), true), 409, 'This lesson has changed. Reload and review the updated content.');
            $identity = ['user_id' => $user->id, 'course_id' => $course->id, 'lesson_key' => $key];
            DB::table('learning_course_lesson_progress')->insertOrIgnore([...$identity, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('learning_course_lesson_progress')->where($identity)->whereNull('completed_at')
                ->update(['completed_at' => now(), 'updated_at' => now()]);
            $summary = $this->summary($lessons, $this->records($user, $course->id));
            if ($summary['total'] > 0 && $summary['completed'] === $summary['total']) {
                DB::table('learning_course_certificates')->insertOrIgnore([
                    'user_id' => $user->id, 'course_id' => $course->id, 'reference' => (string) Str::uuid(),
                    'member_name' => $user->name, 'course_title' => $course->title, 'issued_at' => now(),
                ]);
            }
            return $summary;
        });
    }

    public function saveNotes(User $user, LearningCourse $course, string $key, ?string $notes): void
    {
        $identity = ['user_id' => $user->id, 'course_id' => $course->id, 'lesson_key' => $key];
        DB::table('learning_course_lesson_progress')->upsert([
            [...$identity, 'notes' => $notes, 'created_at' => now(), 'updated_at' => now()],
        ], ['user_id', 'course_id', 'lesson_key'], ['notes', 'updated_at']);
    }

    public function enrolledCourses(User $user, string $tier): array
    {
        $courses = LearningCourse::query()->where('is_published', true)->whereIn('slug',
            DB::table('learning_demo_course_enrollments')->where('user_id', $user->id)->select('course_slug'))
            ->orderBy('sort_order')->orderBy('id')->get(['id', 'slug', 'title', 'summary', 'category', 'level', 'minutes', 'thumbnail', 'cover_path', 'access_tier', 'lessons']);
        if ($courses->isEmpty()) {
            return [];
        }
        $ids = $courses->modelKeys();
        $records = DB::table('learning_course_lesson_progress')->where('user_id', $user->id)->whereIn('course_id', $ids)
            ->whereNotNull('completed_at')->get(['course_id', 'lesson_key', 'completed_at'])->groupBy('course_id');
        $certificates = DB::table('learning_course_certificates')->where('user_id', $user->id)->whereIn('course_id', $ids)->pluck('reference', 'course_id');
        return $courses->map(function (LearningCourse $course) use ($tier, $records, $certificates): array {
            $summary = $this->summary($this->lessons($course), $records->get($course->id, collect())->keyBy('lesson_key'));
            return [...$course->catalogData(), ...collect($summary)->except('lessons')->all(),
                'eligible' => $course->access_tier === 'free' || in_array($tier, ['plus', 'pro'], true),
                'certificate' => $certificates->get($course->id)];
        })->all();
    }
}
