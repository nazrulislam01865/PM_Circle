<?php

namespace App\Http\Requests\Events;

use Illuminate\Foundation\Http\FormRequest;

final class SaveEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Routes enforce administrator/member role, verification and onboarding.
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'], 'description' => ['required', 'string', 'max:500'],
            'about' => ['nullable', 'string', 'max:10000'], 'category' => ['required', 'string', 'max:80'],
            'starts_at' => ['required', 'date_format:Y-m-d\TH:i'], 'ends_at' => ['nullable', 'date_format:Y-m-d\TH:i', 'after:starts_at'],
            'format' => ['required', 'in:online,in-person'], 'location' => ['exclude_if:format,online', 'required', 'string', 'max:120'],
            'venue' => ['exclude_if:format,online', 'nullable', 'string', 'max:160'], 'address' => ['exclude_if:format,online', 'nullable', 'string', 'max:255'],
            'map_link' => ['exclude_if:format,online', 'nullable', 'string', 'max:2048', 'url:https', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_string($value)) return;
                $parts = parse_url($value);
                $host = strtolower($parts['host'] ?? '');
                $path = $parts['path'] ?? '';
                $mapsPath = $path === '/maps' || str_starts_with($path, '/maps/');
                $allowed = in_array($host, ['maps.google.com', 'maps.app.goo.gl'], true)
                    || (in_array($host, ['google.com', 'www.google.com', 'goo.gl', 'google.com.bd', 'www.google.com.bd'], true) && $mapsPath);
                if (! $allowed || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) {
                    $fail('Paste a valid HTTPS Google Maps share link.');
                }
            }],
            'host' => ['required', 'string', 'max:120'], 'host_type' => ['nullable', 'string', 'max:80'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
            'map_image' => ['exclude_if:format,online', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
            'remove_cover_image' => ['sometimes', 'boolean'],
            'remove_map_image' => ['exclude_if:format,online', 'sometimes', 'boolean'],
            'agenda' => ['nullable', 'array', 'max:20'], 'agenda.*' => ['array:time,title'], 'agenda.*.time' => ['required', 'string', 'max:60'], 'agenda.*.title' => ['required', 'string', 'max:200'],
            'speakers' => ['nullable', 'array', 'max:20'], 'speakers.*' => ['array:name,title'], 'speakers.*.name' => ['required', 'string', 'max:120'], 'speakers.*.title' => ['required', 'string', 'max:160'],
            'open_to_everyone' => ['required', 'boolean'], 'registration_open' => ['required', 'boolean'], 'discussion_open' => ['required', 'boolean'],
            'sponsored' => ['nullable', 'boolean'],
        ];
    }
}
