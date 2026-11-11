<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UploadMasterIconRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return ['icon' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024', 'dimensions:max_width=1024,max_height=1024']];
    }
}
