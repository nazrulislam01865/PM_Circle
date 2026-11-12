<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use App\Actions\Fortify\CreateNewUser;
use App\Models\User;
use App\Support\SignupVerificationMode;
use App\Support\Onboarding\SignupMasterData;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
    public function beginRegistration(Request $request): RedirectResponse
    {
        abort_if($request->user(), 403);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $email = mb_strtolower(trim($data['email']));
        if (User::query()->where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => 'This email is already registered. Please log in.']);
        }
        $verified = $request->session()->get('signup_verified_email');
        if (SignupVerificationMode::current() !== 'off' && (! is_array($verified)
            || ($verified['email'] ?? null) !== $email || ($verified['expires_at'] ?? 0) < time())) {
            throw ValidationException::withMessages(['email' => 'Verify this email address to continue.']);
        }
        $request->session()->put('signup_pending_email', [
            'email' => $email,
            'expires_at' => SignupVerificationMode::current() === 'off' ? time() + 1800 : $verified['expires_at'],
        ]);

        return to_route('join.profile');
    }

    private function pendingEmail(Request $request): ?string
    {
        $pending = $request->session()->get('signup_pending_email');
        $verified = $request->session()->get('signup_verified_email');
        if (! is_array($pending) || ($pending['expires_at'] ?? 0) < time()) return null;
        if (SignupVerificationMode::current() !== 'off' && (! is_array($verified)
            || ($verified['expires_at'] ?? 0) < time()
            || ($verified['email'] ?? null) !== ($pending['email'] ?? null))) return null;
        return $pending['email'] ?? null;
    }

    public function profile(Request $request): Response|RedirectResponse
    {
        if (! $request->user()) {
            $email = $this->pendingEmail($request);
            if (! $email) return to_route('join.account');
            return Inertia::render('auth/RegisterStep2', [
                'isGuest' => true, 'email' => $email, 'name' => '', 'profile' => null, 'certifications' => [],
                'signupOptions' => SignupMasterData::options(),
            ]);
        }
        if (! $request->user()->hasVerifiedEmail()) return to_route('verification.notice');
        if ($request->user()->onboarding_step >= 3) return to_route('dashboard');

        return Inertia::render('auth/RegisterStep2', [
            'name' => $request->user()->name,
            'profile' => $request->user()->profile?->only(['role', 'years_experience', 'resume_scan_status']),
            'certifications' => $request->user()->certifications()->get(['name', 'credential_number']),
            'signupOptions' => SignupMasterData::options(),
        ]);
    }

    public function saveProfile(SaveProfileRequest $request, CompleteProfessionalProfile $action, CreateNewUser $register): RedirectResponse
    {
        abort_if($request->user() && $request->user()->onboarding_step >= 3, 403);
        $data = $request->validated();
        $pendingEmail = $request->user() ? null : $this->pendingEmail($request);
        if (! $request->user() && ! $pendingEmail) return to_route('join.account');
        // Quarantine only. Do not parse or expose until a malware scanner clears the upload.
        $resumePath = $request->hasFile('resume')
            ? $request->file('resume')->store('quarantine/resumes', 'local')
            : null;
        try {
            $user = DB::transaction(function () use ($request, $action, $register, $data, $pendingEmail, $resumePath): User {
                $user = $request->user() ?? $register->create([
                    'email' => $pendingEmail,
                    'name' => $data['name'],
                    'password' => $data['password'],
                    'password_confirmation' => $data['password_confirmation'],
                    'legal_acceptance' => $data['legal_acceptance'],
                ]);
                $action->execute($user, $data, $resumePath);
                return $user;
            });
        } catch (\Throwable $exception) {
            if ($resumePath) Storage::disk('local')->delete($resumePath);
            throw $exception;
        }
        if (! $request->user()) {
            Auth::login($user);
            $request->session()->regenerate();
            $request->session()->forget(['signup_pending_email', 'signup_verified_email', 'signup_email_challenge']);
        }

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
            throw ValidationException::withMessages(['plan' => 'This plan is unavailable without checkout or complimentary access. You can start with Free.']);
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
        return Plan::query()->where('active', true)
            ->orderByRaw("CASE code WHEN 'free' THEN 0 WHEN 'plus' THEN 1 WHEN 'pro' THEN 2 ELSE 3 END")
            ->with(['prices' => fn ($query) => $query->where('active', true)->orderByDesc('version')->orderBy('months')])
            ->get()->map(fn (Plan $plan) => [
                'code' => $plan->code, 'name' => $plan->name, 'benefits' => $plan->benefits,
                'prices' => $plan->prices->unique('months')->values()->map(fn ($price) => [
                    'months' => $price->months, 'amount_minor' => $price->amount_minor, 'currency' => $price->currency,
                ])->all(),
            ])->all();
    }
}


