<?php

namespace App\Http\Requests\Interview;

use App\Domain\Interview\QuestionCatalog;
use App\Domain\Interview\PracticeSettings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StartInterviewRequest extends FormRequest
{
    private ?string $memberPlan = null;

    private function plan(): string
    {
        return $this->memberPlan ??= app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($this->user());
    }

    public function authorize(): bool
    {
        return $this->user() !== null && \App\Domain\Billing\Queries\MemberFeatureAccess::allows($this->plan(), 'plus');
    }

    private ?array $catalogChoices = null;

    public function catalogChoices(): array
    {
        return $this->catalogChoices ??= app(QuestionCatalog::class)->choices();
    }

    private ?array $practiceSettings = null;

    public function practiceSettings(): array
    {
        return $this->practiceSettings ??= PracticeSettings::load();
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
            'count' => ['required', 'integer', Rule::in(array_intersect(array_map('intval', array_keys($choices['count'])), \App\Domain\Billing\Queries\MemberFeatureAccess::interviewCounts($this->plan())))],
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
