<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Services\Exam\PmpQuestionContent;

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
            'correct_answer_text' => ['nullable', 'string', 'max:3000'],
            'explanation' => ['nullable', 'string', 'max:20000'],
            'other_options' => ['nullable', 'string', 'max:10000'],
            'takeaway' => ['nullable', 'string', 'max:10000'],
            'concepts' => ['nullable', 'string', 'max:10000'],
            'references' => ['nullable', 'string', 'max:10000'],
            'eco_task_id' => ['nullable', 'string', 'max:24'],
            'eco_task_focus' => ['nullable', 'string', 'max:255'],
            'approach' => ['nullable', Rule::in(PmpQuestionContent::APPROACHES)],
            'option_rationales' => ['nullable', 'array'],
            'option_rationales.*' => ['nullable', 'string', 'max:3000'],
            'pmbok_performance_domain' => ['nullable', 'string', 'max:150'],
            'legacy_knowledge_area' => ['nullable', 'string', 'max:150'],
            'industry' => ['nullable', 'string', 'max:120'],
            'question_type' => ['sometimes', Rule::in(['Single Select'])],
            'reference_publication' => ['nullable', 'string', 'max:255'],
            'reference_section' => ['nullable', 'string', 'max:100'],
            'reference_heading' => ['nullable', 'string', 'max:255'],
            'reference_pdf_page' => ['nullable', 'integer', 'between:1,32767'],
            'eco_reference' => ['nullable', 'string', 'max:350'],
            'review_status' => ['sometimes', Rule::in(PmpQuestionContent::REVIEW_STATUSES)],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
