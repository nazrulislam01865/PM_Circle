<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /** @param array<string, mixed> $input */
    public function create(array $input): User
    {
        if (app()->isProduction() && ! config('pm-circle.legal_documents_published')) {
            throw ValidationException::withMessages(['legal_acceptance' => 'Registration is unavailable until the current Terms and Privacy Policy are published.']);
        }

        $input['email'] = mb_strtolower(trim((string) ($input['email'] ?? '')));

        Validator::make($input, [
            ...$this->profileRules(),
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
            'legal_acceptance' => ['accepted'],
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::create([
                'name' => trim($input['name']),
                'email' => $input['email'],
                'password' => Hash::driver('bcrypt')->make($input['password']),
                'onboarding_step' => 1,
                'accepted_terms_version' => config('pm-circle.terms_version'),
                'accepted_privacy_version' => config('pm-circle.privacy_version'),
                'legal_accepted_at' => now(),
            ]);
            $user->profile()->create(['visibility' => 'public']);

            return $user;
        });
    }
}
