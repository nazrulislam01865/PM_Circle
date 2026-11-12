<?php

namespace App\Http\Requests\Admin;

use App\Support\Admin\HomepageMasterData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreMasterDataOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(array_keys($this->routeIs('admin.navigation.store') ? HomepageMasterData::NAVIGATION_GROUPS : HomepageMasterData::editableDropdownGroups()))],
            'value' => ['required', 'string', 'max:160', Rule::unique('master_data_options')->where('category', $this->input('category')),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! is_string($value) || ! HomepageMasterData::isAllowedNewValue((string) $this->input('category'), $value)) {
                        $fail('Choose a supported value for this category. Links must stay on this website; new icon types require a code update.');
                    }
                }],
            'label' => ['required', 'string', 'max:160'],
        ];
    }
}
