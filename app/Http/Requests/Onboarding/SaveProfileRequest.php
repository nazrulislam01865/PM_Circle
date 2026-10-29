<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class SaveProfileRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->hasVerifiedEmail() ?? false; }

    public function rules(): array
    {
        return [
            'role' => ['nullable', 'string', 'max:80'],
            'years_experience' => ['nullable', 'integer', 'between:0,60'],
            'certifications' => ['sometimes', 'array', 'max:8'],
            'certifications.*.name' => ['required', 'string', 'max:100'],
            'certifications.*.credential_number' => ['nullable', 'string', 'max:120'],
            'resume' => ['nullable', File::types(['pdf', 'docx'])->max('5mb')],
        ];
    }
}
