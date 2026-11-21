<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ImportInterviewQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'set_id' => ['required', 'integer', Rule::exists('interview_question_sets', 'id')],
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt,xlsx'],
        ];
    }
}
