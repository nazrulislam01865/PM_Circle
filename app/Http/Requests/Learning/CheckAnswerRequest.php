<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

final class CheckAnswerRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }
    public function rules(): array { return ['choice' => ['required', 'in:A,B,C,D']]; }
}
