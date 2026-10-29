<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

final class CompleteActivityRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }
    public function rules(): array { return ['response' => ['nullable', 'string', 'max:2000']]; }
}
