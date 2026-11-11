<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

final class UploadHomepageImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return ['image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048']];
    }
}
