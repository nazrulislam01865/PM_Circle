<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;

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

        return array_merge($rules, [
            'headline' => ['nullable', 'string', 'max:200'],
            'role' => ['nullable', 'string', 'max:120'],
            'industry' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'about' => ['nullable', 'string', 'max:2000'],
            'skills' => ['nullable', 'array'],
            'skills.*' => ['string', 'max:50'],
            'open_to_opportunities' => ['nullable', 'boolean'],
            'visibility' => ['nullable', 'string', 'in:public,members_only,private'],
            'resume_employer_visibility' => ['nullable', 'boolean'],
            'contact_visibility' => ['nullable', 'string', 'in:private,members'],
        ]);
    }
}
