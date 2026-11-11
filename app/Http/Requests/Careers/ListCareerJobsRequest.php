<?php

namespace App\Http\Requests\Careers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ListCareerJobsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
            'type' => ['sometimes', 'nullable', Rule::in([
                'Full time', 'Part time', 'Contract', 'Internship', 'Temporary',
                'Per diem', 'Volunteer', 'Other',
            ])],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}
