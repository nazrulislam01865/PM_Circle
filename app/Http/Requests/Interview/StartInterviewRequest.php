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
        $choices = app(QuestionCatalog::class)->choices();
        return [
            'industry' => ['required', Rule::in(array_keys($choices['industry']))],
            'role' => ['required', Rule::in(array_keys($choices['role']))],
            'experience' => ['required', Rule::in(array_keys($choices['experience']))],
            'types' => ['required', 'array', 'min:1', 'max:20'],
            'types.*' => ['required', 'string', 'distinct', Rule::in(array_keys($choices['type']))],
            'count' => ['required', 'integer', Rule::in(array_map('intval', array_keys($choices['count'])))],
            'mode' => ['required', Rule::in(array_keys($choices['mode']))],
            'question_set' => ['nullable', 'integer', Rule::exists('interview_question_sets', 'id')->where('is_active', true)],
        ];
    }
}
