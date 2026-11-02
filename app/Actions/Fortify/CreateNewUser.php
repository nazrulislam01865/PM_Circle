<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /** @param array<string, mixed> $input */
    public function create(array $input): User
    {
        if (app()->isProduction() && ! config('pm-circle.legal_documents_published')) {
            throw ValidationException::withMessages(['legal_acceptance' => 'Registration is unavailable until the current Terms and Privacy Policy are published.']);
        }

        $input['email'] = mb_strtolower(trim((string) ($input['email'] ?? '')));

        Validator::make($input, [
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
            'legal_acceptance' => ['accepted'],
        ])->validate();

        $name = ! empty($input['name']) ? trim((string) $input['name']) : explode('@', $input['email'])[0];

        return DB::transaction(function () use ($input, $name): User {
            $user = User::create([
                'name' => $name,
                'email' => $input['email'],
                'password' => Hash::driver('bcrypt')->make($input['password']),
                'onboarding_step' => 1,
                'email_verified_at' => now(),
                'accepted_terms_version' => config('pm-circle.terms_version'),
                'accepted_privacy_version' => config('pm-circle.privacy_version'),
                'legal_accepted_at' => now(),
            ]);
            $user->profile()->create(['visibility' => 'public']);

            return $user;
        });
    }
}
