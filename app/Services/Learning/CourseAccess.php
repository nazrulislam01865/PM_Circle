<?php

namespace App\Services\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\LearningCourse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class CourseAccess
{
    public function canRead(Request $request, LearningCourse $course, CurrentMemberPlan $plans): bool
    {
        $user = $request->user();
        if (! $course->is_published || ! $user || $user->is_admin || $user->status !== 'active' || $user->onboarding_step < 3 || ! $user->hasVerifiedEmail()) {
            return false;
        }
        if ($course->access_tier !== 'free' && ! \App\Domain\Billing\Queries\MemberFeatureAccess::allowsCourse($plans->code($user), $course->access_tier)) {
            return false;
        }
        return DB::table('learning_demo_course_enrollments')->where('user_id', $user->id)
            ->where('course_slug', $course->slug)->exists();
    }

    public function ensureEnrolled(Request $request, LearningCourse $course, CurrentMemberPlan $plans): void
    {
        abort_unless($this->canRead($request, $course, $plans), 403);
    }
}
