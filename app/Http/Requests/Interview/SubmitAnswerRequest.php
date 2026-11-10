<?php

namespace App\Http\Requests\Interview;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SubmitAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'position' => ['required', 'integer', 'min:0', 'max:9'],
            'answer' => ['required', 'string', 'min:20', 'max:6000'],
            'mode' => ['required', Rule::in(['type', 'speak'])],
        ];
    }
}
