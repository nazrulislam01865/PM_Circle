<?php

namespace App\Http\Requests\Interview;

use App\Domain\Interview\QuestionCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StartInterviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'industry' => ['required', Rule::in(array_keys(QuestionCatalog::INDUSTRIES))],
            'role' => ['required', Rule::in(QuestionCatalog::ROLES)],
            'experience' => ['required', Rule::in(array_keys(QuestionCatalog::EXPERIENCE))],
            'types' => ['required', 'array', 'min:1', 'max:4'],
            'types.*' => ['required', 'distinct', Rule::in(['General', 'Behavioral', 'Technical', 'Situational'])],
            'count' => ['required', 'integer', Rule::in([5, 10])],
            'mode' => ['required', Rule::in(['type', 'speak', 'both'])],
        ];
    }
}
