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

    private ?array $catalogChoices = null;

    public function catalogChoices(): array
    {
        return $this->catalogChoices ??= app(QuestionCatalog::class)->choices();
    }

    public function rules(): array
    {
        $choices = $this->catalogChoices();
        return [
            'industry' => ['required', Rule::in(array_keys($choices['industry']))],
            'role' => ['required', Rule::in(array_keys($choices['role']))],
            'experience' => ['required', Rule::in(array_keys($choices['experience']))],
            'types' => ['required', 'array', 'min:1', 'max:20'],
            'types.*' => ['required', 'string', 'distinct', Rule::in(array_keys($choices['type']))],
            'count' => ['required', 'integer', Rule::in(array_map('intval', array_keys($choices['count'])))],
            'mode' => ['required', Rule::in(array_keys($choices['mode']))],
            'profession' => ['nullable', 'string', 'max:100'],
            'requested_experience' => ['nullable', 'string', 'max:120'],
            'jd' => ['nullable', 'string', 'max:12000'],
            'mix' => ['nullable', Rule::in(['recommended', 'common', 'focus'])],
            'focus' => ['nullable', 'array', 'max:3'],
            'focus.*' => ['string', 'distinct', 'max:100'],
            'draft' => ['nullable', 'uuid'],
            'question_set' => ['nullable', 'integer', Rule::exists('interview_question_sets', 'id')->where('is_active', true)],
        ];
    }
}
