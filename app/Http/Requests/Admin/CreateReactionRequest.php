<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class CreateReactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'label' => ['required', 'string', 'min:2', 'max:32', 'regex:/\A[A-Za-z][A-Za-z0-9 _-]*\z/D'],
            'icon' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024',
                'dimensions:min_width=32,min_height=32,max_width=1024,max_height=1024'],
        ];
    }
}
