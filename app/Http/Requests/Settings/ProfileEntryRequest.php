<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class ProfileEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $id = ['sometimes', 'nullable', 'integer', 'min:1'];

        return match ($this->route()->getName()) {
            'profile.projects.save' => [
                'id' => $id,
                'title' => ['required', 'string', 'max:180'],
                'summary' => ['nullable', 'string', 'max:3000'],
                'role' => ['nullable', 'string', 'max:100'],
                'team_size' => ['nullable', 'integer', 'min:1', 'max:1000'],
                'delivery_months' => ['nullable', 'integer', 'min:1', 'max:1200'],
                'is_featured' => ['required', 'boolean'],
                'is_anonymized' => ['required', 'boolean'],
            ],
            'profile.educations.save' => [
                'id' => $id,
                'degree' => ['required', 'string', 'max:180'],
                'institution' => ['required', 'string', 'max:180'],
                'year' => ['nullable', 'string', 'max:20'],
            ],
            'profile.certifications.save' => [
                'id' => $id,
                'name' => ['required', 'string', 'max:100'],
                'credential_number' => ['nullable', 'string', 'max:120'],
                'valid_until' => ['nullable', 'string', 'max:20'],
            ],
            default => [],
        };
    }
}
