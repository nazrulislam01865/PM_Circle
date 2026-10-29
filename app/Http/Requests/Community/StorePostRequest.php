<?php

namespace App\Http\Requests\Community;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->hasVerifiedEmail() && $this->user()?->onboarding_step >= 3; }
    public function rules(): array
    {
        return ['body' => ['required', 'string', 'min:5', 'max:5000'], 'topic' => ['required', Rule::in(['I learned', 'From my project', 'Ask the community'])]];
    }
}
