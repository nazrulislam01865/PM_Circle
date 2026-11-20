<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateReactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'min:2', 'max:32', 'regex:/\A[A-Za-z][A-Za-z0-9 _-]*\z/D'],
            'active' => ['required', 'boolean'],
        ];
    }
}
