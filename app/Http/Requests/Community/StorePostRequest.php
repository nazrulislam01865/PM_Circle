<?php

namespace App\Http\Requests\Community;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasVerifiedEmail() && $this->user()?->onboarding_step >= 3;
    }

    public function rules(): array
    {
        return [
            'body' => ['nullable', 'required_without:image', 'string', 'max:5000'],
            'topic' => ['required', Rule::in(['I learned', 'From my project', 'Ask the community', 'Poll'])],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'is_anonymous' => [
                'sometimes', 'boolean',
                Rule::prohibitedIf(fn () => $this->boolean('is_anonymous') && ! in_array(
                    app(CurrentMemberPlan::class)->code($this->user()), ['plus', 'pro'], true,
                )),
            ],
            'visibility' => ['sometimes', Rule::in(['public', 'members'])],
            'poll_options' => ['required_if:topic,Poll', 'array', 'min:2', 'max:4'],
            'poll_options.*' => ['required', 'string', 'max:120', 'distinct'],
            'return_to' => ['sometimes', Rule::in(['dashboard'])],
        ];
    }
}
