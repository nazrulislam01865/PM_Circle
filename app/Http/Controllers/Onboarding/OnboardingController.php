<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Domain\Identity\Actions\ActivateFreeMembership;
use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Domain\Identity\Actions\CompleteProfessionalProfile;
use App\Http\Requests\Onboarding\SaveProfileRequest;
use App\Models\Plan;
use App\Models\PlanPrice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function profile(Request $request): Response|RedirectResponse
    {
        if ($request->user()->onboarding_step >= 3) return to_route('dashboard');

        return Inertia::render('auth/RegisterStep2', [
            'profile' => $request->user()->profile?->only(['role', 'years_experience', 'resume_scan_status']),
            'certifications' => $request->user()->certifications()->get(['name', 'credential_number']),
        ]);
    }

    public function saveProfile(SaveProfileRequest $request, CompleteProfessionalProfile $action): RedirectResponse
    {
        abort_if($request->user()->onboarding_step >= 3, 403);
        // Quarantine only. Do not parse or expose until a malware scanner clears the upload.
        $resumePath = $request->hasFile('resume')
            ? $request->file('resume')->store('quarantine/resumes', 'local')
            : null;
        $action->execute($request->user(), $request->validated(), $resumePath);

        return to_route('join.plan');
    }

    public function plan(Request $request): Response|RedirectResponse
    {
        if ($request->user()->onboarding_step >= 3) return to_route('dashboard');

        return Inertia::render('auth/RegisterStep3', [
            'plans' => $this->catalog(),
            'temporaryAccessEnabled' => SetTemporaryMembership::enabled(),
        ]);
    }

    public function choosePlan(Request $request, ActivateFreeMembership $action, SetTemporaryMembership $temporary): RedirectResponse
    {
        $data = $request->validate([
            'plan' => ['required', Rule::in(['free', 'plus', 'pro'])],
            'months' => ['required', 'integer', Rule::in([1, 3, 6, 12])],
        ]);
        $price = PlanPrice::query()->whereHas('plan', fn ($query) => $query->where('code', $data['plan'])->where('active', true))
            ->where('months', $data['months'])->where('active', true)->orderByDesc('version')->first();
        if (! $price) throw ValidationException::withMessages(['months' => 'This plan duration is unavailable.']);
        if ($data['plan'] !== 'free' && ! SetTemporaryMembership::enabled()) {
            throw ValidationException::withMessages(['plan' => 'Paid checkout is not yet configured. You can start with Free and upgrade once payments are enabled.']);
        }

        $action->execute($request->user());
        if (SetTemporaryMembership::enabled()) {
            $temporary->execute($request->user(), $data['plan']);
        }

        return to_route('dashboard');
    }

    /** @return array<int, array<string, mixed>> */
    public function catalog(): array
    {
        return Plan::query()->where('active', true)->with(['prices' => fn ($query) => $query->where('active', true)->orderByDesc('version')->orderBy('months')])
            ->get()->map(fn (Plan $plan) => [
                'code' => $plan->code, 'name' => $plan->name, 'benefits' => $plan->benefits,
                'prices' => $plan->prices->unique('months')->values()->map(fn ($price) => [
                    'months' => $price->months, 'amount_minor' => $price->amount_minor, 'currency' => $price->currency,
                ])->all(),
            ])->all();
    }
}
