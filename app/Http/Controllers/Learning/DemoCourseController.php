<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Learning\Queries\DemoCourseCatalog;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class DemoCourseController extends Controller
{
    public function show(Request $request, string $course, DemoCourseCatalog $catalog, CurrentMemberPlan $plans): Response
    {
        $record = $catalog->find($course);
        abort_unless($record, 404);
        $member = $request->user();
        $joined = $member && (int) $member->onboarding_step >= 3 && $member->hasVerifiedEmail();
        $tier = $joined ? $plans->code($member) : 'free';
        $eligible = $record['accessTier'] === 'free' || in_array($tier, ['plus', 'pro'], true);
        $enrolled = $joined && DB::table('learning_demo_course_enrollments')
            ->where('user_id', $member->id)->where('course_slug', $course)->exists();
        $saved = $joined && DB::table('learning_demo_course_saves')
            ->where('user_id', $member->id)->where('course_slug', $course)->exists();

        $courseModel = \App\Models\LearningCourse::query()->where('slug', $course)->firstOrFail();
        $counts = $courseModel->practice_enabled
            ? \App\Models\LearningCourseQuestion::query()->where('course_id', $courseModel->id)
                ->where('is_published', true)->selectRaw('section_title, topic_title, COUNT(*) AS total')
                ->groupBy('section_title', 'topic_title')->get()->groupBy('section_title')
            : collect();
        $resources = \App\Models\LearningCourseResource::query()->where('course_id', $courseModel->id)
            ->where('is_published', true)->orderBy('section_title')->orderBy('title')
            ->get(['id', 'title', 'section_title', 'description', 'kind'])
            ->map(fn ($resource) => [
                'id' => $resource->id, 'title' => $resource->title,
                'section' => $resource->section_title, 'description' => $resource->description,
                'kind' => $resource->kind,
            ])->all();
        $practice = [
            'enabled' => $courseModel->practice_enabled,
            'questionCount' => $courseModel->practice_question_count,
            'durationMinutes' => $courseModel->practice_duration_minutes,
            'available' => (int) $counts->flatten(1)->sum('total'),
            'sections' => collect($courseModel->outline ?? [])->map(fn ($section) => [
                'title' => $section['title'],
                'available' => (int) ($counts[$section['title']] ?? collect())->sum('total'),
                'topics' => collect($section['topics'] ?? [])->map(fn ($topic) => [
                    'title' => $topic,
                    'available' => (int) ($counts[$section['title']] ?? collect())
                        ->where('topic_title', $topic)->sum('total'),
                ])->all(),
            ])->all(),
        ];

        return Inertia::render('learning/CourseShow', [
            'course' => [
                ...collect($record)->except('lessons')->all(),
                'lessons' => collect($record['lessons'])->map(fn ($lesson) => [
                    'title' => $lesson['title'],
                    // Server-side gate: no lesson body leaks before enrollment or after a downgrade.
                    'body' => $joined && $enrolled && $eligible ? $lesson['body'] : null,
                ])->all(),
            ],
            'isMember' => (bool) $joined,
            'isAuthenticated' => (bool) $member,
            'eligible' => $eligible,
            'enrolled' => (bool) $enrolled,
            'saved' => (bool) $saved,
            'memberTier' => $tier,
            'practice' => $practice,
            'resources' => $resources,
        ]);
    }

    public function enroll(Request $request, string $course, DemoCourseCatalog $catalog, CurrentMemberPlan $plans): RedirectResponse
    {
        $accessTier = $catalog->accessTier($course);
        abort_unless($accessTier, 404);

        // Paid-labelled courses carry no separate charge for active Plus/Pro subscribers.
        abort_unless($accessTier === 'free' || in_array($plans->code($request->user()), ['plus', 'pro'], true), 403);
        DB::table('learning_demo_course_enrollments')->insertOrIgnore([
            'user_id' => $request->user()->id,
            'course_slug' => $course,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect()->route($request->routeIs('dashboard.learning.courses.enroll') ? 'dashboard.learning.courses.show' : 'learning.courses.show', $course);
    }

    public function save(Request $request, string $course, DemoCourseCatalog $catalog): RedirectResponse
    {
        abort_unless($catalog->accessTier($course), 404);
        DB::table('learning_demo_course_saves')->insertOrIgnore([
            'user_id' => $request->user()->id,
            'course_slug' => $course,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return back();
    }

    public function unsave(Request $request, string $course, DemoCourseCatalog $catalog): RedirectResponse
    {
        abort_unless($catalog->accessTier($course), 404);
        DB::table('learning_demo_course_saves')->where('user_id', $request->user()->id)
            ->where('course_slug', $course)->delete();

        return back();
    }
}
