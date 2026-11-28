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
        if ($request->query('view') !== 'plans' && ! $request->session()->get('errors')?->has('plan') && ! $request->session()->get('errors')?->has('months')) {
            return Inertia::render('billing/PlanUsage', app(\App\Domain\Billing\Queries\MemberPlanUsage::class)->forMember($request->user()));
        }
        return Inertia::render('billing/Membership', [
            'plans' => $onboarding->catalog(),
            'content' => \App\Support\Admin\PublicPageContent::load('compare-plans'),
            'currentPlan' => $current->code($request->user()),
            'temporaryAccessEnabled' => SetTemporaryMembership::switchingEnabled(),
        ]);
    }

    public function update(Request $request, SetTemporaryMembership $action): RedirectResponse
    {
        abort_unless(SetTemporaryMembership::switchingEnabled(), 403);
        $data = $request->validate([
            'plan' => ['required', Rule::in(['free', 'plus', 'pro'])],
            'months' => ['required_unless:plan,free', 'nullable', 'integer', 'min:1', 'max:60'],
        ]);
        $action->execute($request->user(), $data['plan'], isset($data['months']) ? (int) $data['months'] : null);

        return to_route('dashboard')->with('status', 'Membership access updated. No payment was collected.');
    }
}
