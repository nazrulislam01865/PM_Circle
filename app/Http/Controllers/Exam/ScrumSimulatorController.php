<?php

namespace App\Http\Controllers\Exam;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class ScrumSimulatorController extends Controller
{
    /** Public information remains visible to guests; members enter the protected workspace. */
    public function preview(Request $request): Response|RedirectResponse
    {
        if ($request->user()) {
            return $request->user()->is_admin
                ? to_route('admin.dashboard')
                : to_route('exams.scrum.index');
        }

        return Inertia::render('public/ComingSoon', ['title' => 'Scrum / CSM Simulator']);
    }

    public function __invoke(Request $request, CurrentMemberPlan $plans): Response
    {
        abort_unless(MemberFeatureAccess::allowsExamSimulator($plans->code($request->user())), 403,
            'Exam Simulator access requires an active Plus or Pro membership.');

        return Inertia::render('public/ComingSoon', ['title' => 'Scrum / CSM Simulator']);
    }
}
