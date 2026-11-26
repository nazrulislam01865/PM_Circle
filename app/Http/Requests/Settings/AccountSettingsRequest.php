<?php

namespace App\Http\Requests\Settings;

use App\Domain\Identity\Services\ProfileFieldPrivacy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class AccountSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && ! $this->user()->is_admin;
    }

    public function rules(): array
    {
        $rules = [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:32', 'regex:/^[+()\d\s.-]+$/', function ($attribute, $value, $fail): void {
                if (! is_string($value)) return;
                $digits = strlen(preg_replace('/\D/', '', $value));
                if ($digits < 7 || $digits > 15) $fail('Enter a valid phone number with 7 to 15 digits.');
            }],
            'visibility' => ['sometimes', 'required', Rule::in(['public', 'members_only', 'private'])],
        ];
        foreach (config('account_settings') as $page) {
            foreach ($page[3] as $group) {
                foreach ($group[1] as $field) {
                    if ($field['mode'] !== 'preference') continue;
                    $rules[$field['id']] = $field['type'] === 'toggle'
                        ? ['sometimes', 'required', 'boolean']
                        : ($field['type'] === 'time'
                            ? ['sometimes', 'required', 'date_format:H:i']
                            : ['sometimes', 'required', Rule::in($field['choices'])]);
                }
            }
        }

        return array_merge($rules, ProfileFieldPrivacy::validationRules());
    }
}
