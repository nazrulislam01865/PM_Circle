<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use App\Support\Admin\HomepageMasterData;
use Illuminate\Validation\Rule;

final class UpdateMasterDataOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'max:160'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['required', 'boolean'],
            'value' => ['sometimes', 'required', 'string', 'max:160',
                Rule::unique('master_data_options')->where('category', $this->route('masterDataOption')?->category)
                    ->ignore($this->route('masterDataOption')?->id),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $option = $this->route('masterDataOption');
                    if (! $this->routeIs('admin.navigation.update') || ! $option
                        || ! is_string($value) || ! HomepageMasterData::isAllowedNewValue($option->category, $value)) {
                        $fail('Choose a valid same-site page destination.');
                    }
                }],
        ];
    }
}
