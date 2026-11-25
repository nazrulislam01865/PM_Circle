<?php

namespace App\Http\Requests\AI;

use App\Domain\AI\Services\AiFeatureCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StartAiRequestRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        return [
            'client_request_key' => ['required', 'uuid', 'max:120'],
            'feature' => ['required', 'string', Rule::in(array_diff(array_keys(AiFeatureCatalog::FEATURES),
                ['scenario_generate', 'trend_draft', 'daily_challenge_review']))],
            'subject' => ['sometimes', 'array:attempt_id,question_id,response_id,resume_id,section,draft'],
            'subject.attempt_id' => ['sometimes', 'integer', 'min:1'],
            'subject.question_id' => ['sometimes', 'integer', 'min:1'],
            'subject.response_id' => ['sometimes', 'integer', 'min:1'],
            'subject.resume_id' => ['sometimes', 'integer', 'min:1'],
            'subject.draft' => ['sometimes', 'boolean'],
            'subject.section' => ['sometimes', 'string', 'max:60'],
            'conversation_id' => ['sometimes', 'integer', 'min:1'],
            'message' => ['nullable', 'string', 'max:20000'],
            'consent' => ['sometimes', 'boolean'],
            'accepted_max_credits' => ['required', 'integer', 'min:0', 'max:100000'],
        ];
    }
}
