<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SaveInterviewQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'set_id' => ['required', 'integer', Rule::exists('interview_question_sets', 'id')],
            'type' => ['required', 'string', Rule::exists('master_data_options', 'value')->where('category', 'interview_type')],
            'text' => ['required', 'string', 'min:10', 'max:4000'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
