<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;
use App\Support\SignupPasswordRules;
use App\Support\SignupVerificationMode;
use App\Support\Onboarding\SignupMasterData;
use Illuminate\Validation\Rule;

class SaveProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        if ($this->user()) {
            return $this->user()->hasVerifiedEmail();
        }

        $pending = $this->session()->get('signup_pending_email');
        $verified = $this->session()->get('signup_verified_email');

        return is_array($pending) && ($pending['expires_at'] ?? 0) >= time()
            && (SignupVerificationMode::current() === 'off'
                || (is_array($verified) && ($verified['expires_at'] ?? 0) >= time()
                    && ($verified['email'] ?? null) === ($pending['email'] ?? null)));
    }

    public function rules(): array
    {
        $options = SignupMasterData::options();
        $allowed = static fn (string $category): array => array_column($options[$category] ?? [], 'value');

        return [
            'name' => ['required', 'string', 'max:255'],
            'role' => ['nullable', 'string', 'max:80', Rule::in($allowed('signup_role'))],
            'years_experience' => ['nullable', 'integer', 'between:0,60', Rule::in($allowed('signup_experience'))],
            'certifications' => ['sometimes', 'array', 'max:8'],
            'certifications.*.name' => ['required', 'string', 'max:100', Rule::in($allowed('signup_certification'))],
            'certifications.*.credential_number' => ['nullable', 'string', 'max:120'],
            'resume' => ['nullable', File::types(['pdf', 'docx'])->max('5mb')],
            ...(! $this->user() ? [
                'password' => ['required', 'string', SignupPasswordRules::rule(), 'confirmed'],
                'password_confirmation' => ['required', 'string'],
                'legal_acceptance' => ['accepted'],
            ] : []),
        ];
    }
}
