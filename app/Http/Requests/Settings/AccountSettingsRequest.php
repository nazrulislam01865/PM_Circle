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
        $pages = \App\Domain\Identity\Services\AccountSettingsCatalog::hasInterviewInput($this->all())
            ? \App\Domain\Identity\Services\AccountSettingsCatalog::pages() : config('account_settings');
        foreach ($pages as $page) {
            foreach ($page[3] as $group) {
                foreach ($group[1] as $field) {
                    if ($field['mode'] !== 'preference') {
                        if (isset($field['options'])) $rules[$field['id']] = ['prohibited'];
                        continue;
                    }
                    $rules[$field['id']] = $field['type'] === 'toggle'
                        ? ['sometimes', 'required', 'boolean']
                        : ($field['type'] === 'time'
                            ? ['sometimes', 'required', 'date_format:H:i']
                            : ['sometimes', 'required', Rule::in($field['choices'])]);
                }
            }
        }

        $keys = ProfileFieldPrivacy::keys();
        $rules['field_visibility_patch'] = ['sometimes', 'array:'.implode(',', $keys), 'min:1', 'max:'.count($keys), 'prohibits:field_visibility'];
        foreach ($keys as $key) {
            $rules['field_visibility_patch.'.$key] = ['sometimes', 'required', Rule::in(['public', 'community', 'private'])];
        }
        return array_merge($rules, ProfileFieldPrivacy::validationRules());
    }
}
