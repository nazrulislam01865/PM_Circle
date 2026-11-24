<?php

namespace App\Http\Requests\Admin;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\TrendAiConnection;
use App\Domain\Careers\Services\CareerTrendSettings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCareerTrendSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()?->is_admin) {
            return false;
        }
        app(AiAdminAccess::class)->authorize($this->user(), 'ai.manage_editorial');

        return true;
    }

    public function rules(): array
    {
        $rules = [
            'ai_provider' => ['required', Rule::in(array_keys(TrendAiConnection::PROVIDERS))],
            'publish_time' => ['required', 'date_format:H:i'],
            'title_pattern' => ['required', 'string', 'max:160'],
            'include_source_links' => ['required', 'boolean'],
            'include_source_dates' => ['required', 'boolean'],
        ];
        foreach (CareerTrendSettings::OPTIONS as $key => $choices) {
            if (in_array($key, ['topics', 'target_levels'], true)) {
                $rules[$key] = ['required', 'array', 'list', 'min:1', 'max:500'];
                $rules[$key.'.*'] = ['required', 'string', 'max:160', 'distinct:ignore_case', 'regex:/^[^\p{C}<>]*[\p{L}\p{N}][^\p{C}<>]*$/uD'];
                continue;
            }
            $allowed = Rule::in(array_map('strval', array_keys($choices)));
            if ($key === 'sections') {
                $rules[$key] = ['required', 'array', 'min:1', 'max:'.count($choices)];
                $rules[$key.'.*'] = ['required', 'string', 'distinct', $allowed];
            } else {
                $rules[$key] = ['required', 'string', $allowed];
            }
        }

        return $rules;
    }
}
