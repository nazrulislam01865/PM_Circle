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

        return Inertia::render('learning/CourseShow', [
            'course' => [
                ...collect($record)->except('lessons')->all(),
                'lessons' => collect($record['lessons'])->map(fn ($lesson) => [
                    'title' => $lesson['title'],
                    // Server-side gate: no demo lesson body leaks before enrollment or after a downgrade.
                    'body' => $joined && $enrolled && $eligible ? $lesson['body'] : null,
                ])->all(),
            ],
            'isMember' => (bool) $joined,
            'isAuthenticated' => (bool) $member,
            'eligible' => $eligible,
            'enrolled' => (bool) $enrolled,
            'saved' => (bool) $saved,
            'memberTier' => $tier,
        ]);
    }

    public function enroll(Request $request, string $course, DemoCourseCatalog $catalog, CurrentMemberPlan $plans): RedirectResponse
    {
        $record = $catalog->find($course);
        abort_unless($record, 404);

        // Paid-labelled courses carry no separate charge for active Plus/Pro subscribers.
        abort_unless($record['accessTier'] === 'free' || in_array($plans->code($request->user()), ['plus', 'pro'], true), 403);
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
        abort_unless($catalog->find($course), 404);
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
        abort_unless($catalog->find($course), 404);
        DB::table('learning_demo_course_saves')->where('user_id', $request->user()->id)
            ->where('course_slug', $course)->delete();

        return back();
    }
}
