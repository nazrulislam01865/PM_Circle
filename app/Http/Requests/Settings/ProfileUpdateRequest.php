<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use App\Domain\Identity\Services\ProfileFieldPrivacy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        if ($this->has('email') && is_string($this->input('email'))) {
            $this->merge(['email' => mb_strtolower(trim($this->string('email')->toString()))]);
        }
    }

    public function rules(): array
    {
        $rules = $this->profileRules($this->user()->id);
        // Privacy and contact controls send partial PATCH requests.
        // Validate a name/email when present, without requiring both on every PATCH.
        $rules['name'] = ['sometimes', ...$rules['name']];
        $rules['email'] = ['sometimes', ...$rules['email']];

        $fieldRules = ['field_visibility' => ['sometimes', 'required', 'array', 'size:'.count(ProfileFieldPrivacy::keys())]];
        foreach (ProfileFieldPrivacy::keys() as $key) {
            $fieldRules['field_visibility.'.$key] = ['required_with:field_visibility', Rule::in(['public', 'community', 'private'])];
        }

        return array_merge($rules, $fieldRules, [
            // Basic-profile saves require a valid private contact number. Independent
            // privacy-only PATCH requests may omit it to preserve existing controls.
            'phone' => [
                Rule::requiredIf(fn (): bool => $this->input('tab') === 'edit'
                    || $this->hasAny(['headline', 'role', 'industry', 'country', 'city', 'about'])),
                'string', 'max:32', 'regex:/^[+()\d\s.-]+$/',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value)) return;
                    $digits = preg_replace('/\D/', '', $value);
                    if (strlen($digits) < 7 || strlen($digits) > 15) {
                        $fail('Enter a valid phone number with 7 to 15 digits, including the country code.');
                    }
                },
            ],
            'headline' => ['nullable', 'string', 'max:180'],
            'role' => ['nullable', 'string', 'max:80'],
            'industry' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'about' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:50'],
            'linkedin_url' => ['nullable', 'url:http,https', 'max:500'],
            'languages' => ['nullable', 'array', 'max:20'],
            'languages.*' => ['string', 'max:50'],
            'open_to_opportunities' => ['nullable', 'boolean'],
            'visibility' => ['nullable', 'string', 'in:public,members_only,private'],
            'resume_employer_visibility' => ['nullable', 'boolean'],
            'contact_visibility' => ['nullable', 'string', 'in:private,members'],
        ]);
    }
}
