<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SavePmpExamQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:70', 'regex:/^[a-zA-Z0-9_-]+$/', Rule::unique('pmp_exam_questions', 'code')->ignore($this->route('question'))],
            'domain' => ['required', Rule::in(['People', 'Process', 'Business Environment'])],
            'difficulty' => ['required', Rule::in(['Easy', 'Moderate', 'Hard'])],
            'prompt' => ['required', 'string', 'max:10000'],
            'options' => ['required', 'array', 'size:4'],
            'options.A' => ['required', 'string', 'max:3000'],
            'options.B' => ['required', 'string', 'max:3000'],
            'options.C' => ['required', 'string', 'max:3000'],
            'options.D' => ['required', 'string', 'max:3000'],
            'correct_option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
            'explanation' => ['nullable', 'string', 'max:20000'],
            'other_options' => ['nullable', 'string', 'max:10000'],
            'takeaway' => ['nullable', 'string', 'max:10000'],
            'concepts' => ['nullable', 'string', 'max:10000'],
            'references' => ['nullable', 'string', 'max:10000'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
