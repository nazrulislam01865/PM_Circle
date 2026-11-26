<?php

namespace App\Actions\Fortify;

use App\Support\SignupPasswordRules;
use App\Support\Legal\LegalPages;
use App\Models\User;
use App\Support\SignupVerificationMode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /** @param array<string, mixed> $input */
    public function create(array $input): User
    {
        $input['email'] = mb_strtolower(trim((string) ($input['email'] ?? '')));

        Validator::make($input, [
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', SignupPasswordRules::rule(), 'confirmed'],
            'legal_acceptance' => ['accepted'],
        ])->validate();

        // Registration must be bound to the exact address verified in this browser session.
        $requiresCode = SignupVerificationMode::current() !== 'off';

        if ($requiresCode) {
            $verified = request()->session()->get('signup_verified_email');
            if (! is_array($verified) || ($verified['email'] ?? null) !== $input['email']
                || ($verified['expires_at'] ?? 0) < time()) {
                throw ValidationException::withMessages(['email' => 'Verify your email before creating an account.']);
            }
        }

        $name = ! empty($input['name']) ? trim((string) $input['name']) : explode('@', $input['email'])[0];

        $user = DB::transaction(function () use ($input, $name, $requiresCode): User {
            $legal = LegalPages::verifyAcceptance($input);
            $user = new User([
                'name' => $name,
                'email' => $input['email'],
                'password' => Hash::driver('bcrypt')->make($input['password']),
                'onboarding_step' => 1,
                'accepted_terms_version' => $legal['terms'],
                'accepted_privacy_version' => $legal['privacy'],
                'legal_accepted_at' => now(),
            ]);
            // The verification timestamp is guarded against mass assignment.
            // Assign it explicitly before the first insert (no extra query).
            if ($requiresCode) {
                $user->email_verified_at = now();
            }
            $user->save();
            $user->profile()->create(['visibility' => 'public']);

            return $user;
        });

        // Staged registration clears verification only after the professional profile commits.
        if (! request()->session()->has('signup_pending_email')) {
            request()->session()->forget(['signup_verified_email', 'signup_email_challenge']);
        }

        return $user;
    }
}
