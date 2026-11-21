<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Admin\InterviewMasterData;

final class SaveInterviewOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $creating = $this->isMethod('post');
        return [
            'group' => [$creating ? 'required' : 'sometimes', Rule::in(['industry', 'role', 'experience', 'type', 'count', 'mode'])],
            'key' => [$creating ? 'required' : 'sometimes', 'string', 'max:100', function (string $attribute, mixed $value, \Closure $fail) {
                $group = $this->input('group');
                if ($group === 'count' && ! InterviewMasterData::isAllowedValue('interview_count', (string) $value)) {
                    $fail('Question counts must be between 1 and 50.');
                }
                if ($group === 'mode' && ! in_array($value, ['type', 'speak', 'both'], true)) {
                    $fail('Answer mode must be type, speak, or both.');
                }
                if ($group !== null && ! InterviewMasterData::isAllowedValue(InterviewMasterData::category($group), (string) $value)) {
                    $fail('Use a supported value and keep it within the size allowed for this group.');
                }
                if (! preg_match('/^[a-zA-Z0-9][a-zA-Z0-9 _&+.-]*$/', (string) $value)) {
                    $fail('Use letters, numbers, spaces, hyphens, dots, plus signs or ampersands.');
                }
            }],
            'label' => ['required', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
