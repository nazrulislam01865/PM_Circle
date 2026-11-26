<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLegalPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The admin route group enforces authentication, administrator role and verification.
        return true;
    }

    public function rules(): array
    {
        return [
            'revision' => ['required', 'integer', 'min:1'],
            'content' => ['required', 'array:title,description,meta_description,toc_title,sections'],
            'content.title' => ['required', 'string', 'max:150'],
            'content.description' => ['required', 'string', 'max:500'],
            'content.meta_description' => ['required', 'string', 'max:320'],
            'content.toc_title' => ['required', 'string', 'max:100'],
            'content.sections' => ['required', 'array', 'list', 'min:1', 'max:60'],
            'content.sections.*' => ['required', 'array:id,title,body,toc_label,show_in_toc'],
            'content.sections.*.id' => ['required', 'string', 'max:80', 'distinct:strict', 'regex:/^[a-z][a-z0-9-]*$/D'],
            'content.sections.*.title' => ['required', 'string', 'max:180'],
            'content.sections.*.toc_label' => ['nullable', 'string', 'max:180'],
            'content.sections.*.show_in_toc' => ['sometimes', 'boolean'],
            'content.sections.*.body' => ['required', 'string', 'max:20000', function (string $attribute, mixed $value, \Closure $fail): void {
                if (! is_string($value)) {
                    return;
                }
                preg_match_all('~\*\*[^*\n]+\*\*|\[([^\]\n]+)\]\(([^\s)]+)\)~', $value, $matches, PREG_SET_ORDER);
                foreach ($matches as $match) {
                    if (isset($match[2]) && ! self::safeLink($match[2])) {
                        $fail('Links must use a site path or a valid HTTPS URL without credentials.');
                        return;
                    }
                }
            }],
        ];
    }
    private static function safeLink(string $href): bool
    {
        if (preg_match('~^/(?!/)[a-zA-Z0-9/_-]*(?:#[a-zA-Z0-9_-]+)?$~D', $href)) {
            return true;
        }
        if (! preg_match('~^https://~i', $href) || str_contains($href, chr(92)) || str_contains($href, '(') || str_contains($href, ')')) {
            return false;
        }
        $url = parse_url($href);
        return is_array($url) && ! empty($url['host']) && ! isset($url['user']) && ! isset($url['pass'])
            && filter_var($href, FILTER_VALIDATE_URL) !== false;
    }
}
