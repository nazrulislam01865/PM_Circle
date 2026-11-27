<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Domain\Achievements\Services\BadgeCatalog;

final class SaveAchievementBadgeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true && $this->user()->status === 'active' && $this->user()->email_verified_at !== null;
    }

    public function rules(): array
    {
        $metrics = array_column(app(BadgeCatalog::class)->metrics(), 'value');
        return [
            'name' => ['required', 'string', 'max:120'], 'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'], 'mode' => ['required', Rule::in(['milestone', 'completion'])],
            'metric' => ['required', Rule::in($metrics)], 'target' => ['required', 'integer', 'min:1', 'max:10000'],
            'art' => ['required', Rule::in($metrics)], 'tier' => ['required', 'integer', 'between:1,3'],
            'publishStatus' => ['required', Rule::in(['active', 'paused', 'draft', 'archived'])],
            'targets' => ['nullable', 'array', 'max:100'], 'targets.*' => ['string', 'max:160', 'distinct'],
            'match' => ['required', Rule::in(['all', 'any', 'count'])], 'required' => ['required', 'integer', 'min:1', 'max:100'],
            'version' => ['nullable', 'integer', 'min:1'], 'image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
            'removeArtwork' => ['nullable', 'boolean'],
        ];
    }
}
