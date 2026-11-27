<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateInterviewSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'minutes_per_question' => ['required', 'integer', 'min:1', 'max:30'],
            'allow_new_sessions' => ['sometimes', 'required', 'boolean'],
            'allow_job_description' => ['sometimes', 'required', 'boolean'],
            'hero_title' => ['sometimes', 'required', 'string', 'max:120'],
            'hero_description' => ['sometimes', 'required', 'string', 'max:500'],
            'mix_labels' => ['sometimes', 'required', 'array:recommended,common,focus'],
            'mix_labels.recommended' => ['required_with:mix_labels', 'string', 'max:80'],
            'mix_labels.common' => ['required_with:mix_labels', 'string', 'max:80'],
            'mix_labels.focus' => ['required_with:mix_labels', 'string', 'max:80'],
            'recommended_common_percent' => ['sometimes', 'required', 'integer', 'min:0', 'max:100'],
            'focus_percent' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'focus_common_percent' => ['sometimes', 'required', 'integer', 'min:0', 'max:100'],
            'role_profiles' => ['sometimes', 'array', 'max:200'],
            'role_profiles.*' => ['required', 'array:role,profession,focus'],
            'role_profiles.*.role' => ['required', 'string', 'max:70', 'distinct'],
            'role_profiles.*.profession' => ['required', 'string', 'max:100'],
            'role_profiles.*.focus' => ['present', 'array', 'max:30'],
            'role_profiles.*.focus.*' => ['required', 'string', 'max:100'],
        ];
    }
}
