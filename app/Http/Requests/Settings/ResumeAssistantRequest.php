<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

final class ResumeAssistantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->has('document') && strlen(json_encode($this->input('document'), JSON_INVALID_UTF8_SUBSTITUTE) ?: '') > 150000) {
                $validator->errors()->add('document', 'The résumé is too long. Shorten the descriptions before saving.');
            }
        });
    }

    public function rules(): array
    {
        if ($this->routeIs('member.resume-assistant.export')) {
            $rules = \App\Domain\Identity\Services\ResumeDocument::rules();
            $rules['document'][0] = 'required';
            return [
                ...$rules,
                'format' => ['required', 'in:pdf,word'],
                'name' => ['nullable', 'string', 'max:255'],
                'email' => ['nullable', 'string', 'max:255'],
                'role' => ['nullable', 'string', 'max:80'],
                'location' => ['nullable', 'string', 'max:241'],
                'summary' => ['nullable', 'string', 'max:2000'],
            ];
        }
        return [
            ...\App\Domain\Identity\Services\ResumeDocument::rules(),
            'action' => ['required', 'in:draft,submit'],
            'sync_profile' => ['sometimes', 'boolean'],
            'version' => ['required', 'string', 'size:64'],
            'name' => ['required_if:action,submit', 'nullable', 'string', 'max:255'],
            'email' => ['required_if:action,submit', 'nullable', 'email', 'max:255'],
            'role' => ['nullable', 'string', 'max:80'],
            'company' => ['nullable', 'string', 'max:150'],
            'location' => ['nullable', 'string', 'max:241'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'period' => ['nullable', 'string', 'max:110'],
            'responsibilities' => ['nullable', 'string', 'max:4000'],
            'skills' => ['nullable', 'string', 'max:5000'],
            'degree' => ['nullable', 'string', 'max:180'],
            'institution' => ['nullable', 'string', 'max:180'],
            'certification' => ['nullable', 'string', 'max:100'],
        ];
    }
}
