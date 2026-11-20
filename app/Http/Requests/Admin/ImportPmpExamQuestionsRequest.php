<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class ImportPmpExamQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:5120', 'mimes:csv,txt,xlsx'],
            'activate_all' => ['sometimes', 'boolean'],
        ];
    }
}
