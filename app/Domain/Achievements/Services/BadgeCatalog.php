<?php

namespace App\Domain\Achievements\Services;

use App\Models\LearningCourse;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class BadgeCatalog
{
    public const SUPPORTED = ['courses', 'certificates', 'exams', 'pmpExams', 'challenges', 'posts', 'replies', 'interviews', 'profile', 'minutes'];

    public function definitions(): array
    {
        return DB::table('achievement_badges')->orderBy('position')->orderBy('id')->get()->map(fn ($row) => $this->decode($row))->all();
    }

    public function decode(object $row): array
    {
        $data = json_decode($row->definition, true, 512, JSON_THROW_ON_ERROR);
        return [...$data, 'id' => $row->id, 'publishStatus' => $row->status, 'version' => (int) $row->version,
            'artworkUrl' => empty($data['artwork']) ? null : Storage::disk('public')->url($data['artwork'])];
    }

    public function metrics(): array
    {
        $metrics = [];
        foreach (config('achievements.badges') as $badge) {
            $metrics[$badge['metric']] = ['value' => $badge['metric'], 'label' => $badge['unit'], 'category' => $badge['category'], 'supported' => in_array($badge['metric'], self::SUPPORTED, true)];
        }
        return array_values($metrics);
    }

    public function works(bool $aliases = true): array
    {
        $works = [];
        $add = function (string $id, string $title, string $type, string $module, string $trigger, array $metrics, bool $supported = true) use (&$works): void {
            $works[$id] = compact('id', 'title', 'type', 'module', 'trigger', 'metrics', 'supported') + ['source' => $id];
        };
        foreach (LearningCourse::query()->where('is_published', true)->orderBy('sort_order')->orderBy('id')->get(['id', 'title', 'lessons', 'certificate_enabled']) as $course) {
            foreach (app(CourseLessonProgress::class)->lessons($course) as $lesson) {
                $add('lesson:'.$course->id.':'.$lesson['key'], $lesson['title'], 'Lesson', $course->title, 'Lesson completed', []);
            }
            $add('course:'.$course->id, $course->title, 'Course', 'Course library', 'Course completed', ['courses']);
        }
        $add('metric:pmpExams', 'PMP full mock exam', 'Exam', 'Exams', 'Exam completed', ['pmpExams', 'exams', 'minutes']);
        $add('metric:scrumExams', 'Scrum / CSM mock exam', 'Exam', 'Exams', 'Exam completed', ['scrumExams', 'exams'], false);
        $add('metric:scenarios', 'Complete a practice task', 'Task', 'Project Simulator', 'Practice task completed', ['scenarios'], false);
        $add('metric:challenges', 'Complete a daily challenge', 'Daily Challenge', 'Daily Challenge', 'Qualifying response completed', ['challenges']);
        foreach (DB::table('scenarios')->whereIn('status', ['published', 'closed'])->orderByDesc('id')->get(['id', 'title']) as $challenge) {
            $add('challenge:'.$challenge->id, $challenge->title, 'Daily Challenge', 'Daily Challenge', 'Qualifying response completed', ['challenges']);
        }
        $add('metric:posts', 'Publish an approved community post', 'Community', 'Community feed', 'Post approved and published', ['posts']);
        $add('metric:replies', 'Publish an approved reply', 'Community', 'Community feed', 'Reply approved', ['replies']);
        $add('metric:profile', 'Complete your profile to 100%', 'Profile', 'Profile & career', 'Profile completion verified at 100%', ['profile']);
        $add('metric:resumes', 'Export your completed résumé', 'Profile', 'AI Resume Assistant', 'Résumé export completed', ['resumes'], false);
        $add('metric:interviews', 'Complete a mock interview', 'Interview', 'Interview preparation', 'Interview completed', ['interviews']);
        foreach (DB::table('community_events')->where('status', 'published')->orderBy('starts_at')->get(['id', 'title']) as $event) {
            $add('event:'.$event->id, $event->title, 'Event', 'Community events', 'Verified attendance required', ['events'], false);
        }
        if ($aliases) {
            foreach (DB::table('achievement_work_aliases')->orderBy('id')->get() as $alias) {
                if (isset($works[$alias->source])) {
                    $works['alias:'.$alias->id] = [...$works[$alias->source], 'id' => 'alias:'.$alias->id, 'title' => $alias->title];
                }
            }
        }
        return array_values($works);
    }
}
