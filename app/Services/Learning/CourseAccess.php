<?php

namespace App\Services\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\LearningCourse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CourseAccess
{
    public function ensureEnrolled(Request $request, LearningCourse $course, CurrentMemberPlan $plans): void
    {
        $user = $request->user();
        abort_unless($course->is_published && $user && $user->onboarding_step >= 3 && $user->hasVerifiedEmail(), 403);
        if ($course->access_tier !== 'free') {
            abort_unless(in_array($plans->code($user), ['plus', 'pro'], true), 403);
        }
        abort_unless(DB::table('learning_demo_course_enrollments')->where('user_id', $user->id)
            ->where('course_slug', $course->slug)->exists(), 403);
    }
}
