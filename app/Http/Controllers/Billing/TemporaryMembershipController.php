<?php

namespace App\Http\Controllers\Billing;

use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Onboarding\OnboardingController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class TemporaryMembershipController extends Controller
{
    public function index(Request $request, OnboardingController $onboarding, CurrentMemberPlan $current): Response
    {
        return Inertia::render('billing/Membership', [
            'plans' => $onboarding->catalog(),
            'currentPlan' => $current->code($request->user()),
            'temporaryAccessEnabled' => SetTemporaryMembership::enabled(),
        ]);
    }

    public function update(Request $request, SetTemporaryMembership $action): RedirectResponse
    {
        abort_unless(SetTemporaryMembership::enabled(), 403);
        $data = $request->validate(['plan' => ['required', Rule::in(['free', 'plus', 'pro'])]]);
        $action->execute($request->user(), $data['plan']);

        return to_route('dashboard')->with('status', 'Membership access updated. No payment was collected.');
    }
}
