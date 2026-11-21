<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SaveInterviewSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $option = fn (string $group) => Rule::exists('master_data_options', 'value')->where('category', 'interview_'.$group);
        return [
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:500'],
            'industry' => ['nullable', 'string', $option('industry')],
            'role' => ['nullable', 'string', $option('role')],
            'experience' => ['nullable', 'string', $option('experience')],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
