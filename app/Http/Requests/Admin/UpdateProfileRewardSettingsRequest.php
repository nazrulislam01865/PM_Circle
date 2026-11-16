<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateProfileRewardSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        return [
            'enabled' => ['required', 'boolean'],
            'discount_type' => ['required', Rule::in(['percent', 'fixed'])],
            'discount_value' => ['required', 'numeric', 'min:0.01', 'max:100000',
                Rule::when($this->input('discount_type') === 'percent', ['max:100'])],
            'currency' => ['required', Rule::in(['BDT', 'USD'])],
            'validity_days' => ['required', 'integer', 'between:1,365'],
        ];
    }
}
