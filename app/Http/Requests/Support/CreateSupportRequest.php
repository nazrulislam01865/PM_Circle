<?php

namespace App\Http\Requests\Support;

use App\Domain\Support\SupportTopics;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateSupportRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null && ! $this->user()->is_admin; }

    public function rules(): array
    {
        return [
            'topic' => ['required', Rule::in(SupportTopics::ALL)],
            'subject' => ['required', 'string', 'max:100'],
            'details' => ['required', 'string', 'max:5000'],
            'screenshot' => ['nullable', 'file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
            'submission_key' => ['required', 'uuid'],
        ];
    }
}
