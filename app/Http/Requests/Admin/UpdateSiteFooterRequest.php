<?php

namespace App\Http\Requests\Admin;

use App\Support\Admin\SiteFooterValidation;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateSiteFooterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        return [
            'version' => ['required', 'integer', 'min:0'],
            ...SiteFooterValidation::rules('footer'),
        ];
    }
}
