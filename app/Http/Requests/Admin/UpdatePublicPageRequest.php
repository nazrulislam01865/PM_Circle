<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use App\Support\Admin\PublicPageContent;

final class UpdatePublicPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public static function linkRule(): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail): void {
            if (! is_string($value) || strpbrk($value, '()') !== false || preg_match('~[\s\\\\\x00-\x1f]~', $value)) { $fail('Enter a safe page path or HTTPS URL.'); return; }
            if (preg_match('~^/(?!/)[a-zA-Z0-9/_-]*(?:#[a-zA-Z0-9_-]+)?$~D', $value)) return;
            $url = parse_url($value);
            if (! filter_var($value, FILTER_VALIDATE_URL) || ($url['scheme'] ?? '') !== 'https' || empty($url['host']) || isset($url['user']) || isset($url['pass'])) $fail('Enter a safe page path or HTTPS URL.');
        };
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->route('page') !== 'refund-policy' || $validator->errors()->isNotEmpty()) return;
            foreach ($this->input('content.paragraphs', []) as $index => $paragraph) {
                $label = $paragraph['linkLabel'] ?? null;
                if ($label !== null && $label !== '' && substr_count($paragraph['text'], $label) !== 1) {
                    $validator->errors()->add("content.paragraphs.$index.linkLabel", 'The link text must occur exactly once in the paragraph.');
                }
            }
        }];
    }

    public function rules(): array
    {
        $page = $this->route('page');
        $section = $this->route('section');
        $text = ['required', 'string', 'max:180'];
        $body = ['required', 'string', 'max:4000'];
        $link = ['required', 'string', 'max:2048', self::linkRule()];
        $enabled = ['required', 'boolean'];
        $rules = ['version' => ['required', 'integer', 'min:0']];
        $fields = match ($page.':'.$section) {
            'about:banner', 'trends:banner' => ['title' => $text, 'description' => $body],
            'about:intro' => ['enabled' => $enabled, 'title' => $text, 'description' => $body],
            'about:company' => ['enabled' => $enabled, 'title' => $text, 'description' => $body, 'linkLabel' => $text, 'href' => $link],
            'about:features' => ['enabled' => $enabled, 'title' => $text, 'cards' => ['present', 'array', 'max:12'], 'cards.*' => ['required', 'array:title,description,linkLabel,href'], 'cards.*.title' => $text, 'cards.*.description' => $body, 'cards.*.linkLabel' => $text, 'cards.*.href' => $link],
            'trends:listing' => ['searchLabel' => $text, 'searchPlaceholder' => $text, 'topicLabel' => $text, 'allTopics' => $text, 'searchAction' => $text, 'clearAction' => $text, 'emptyText' => $text],
            'trends:detail' => ['noticeTitle' => $text, 'sourceTitle' => $text, 'sampleNoticeTitle' => $text, 'sampleNoticeText' => $body, 'noticeText' => $body, 'relatedTitle' => $text, 'allReportsLabel' => $text, 'relatedEnabled' => $enabled, 'commentsEnabled' => $enabled, 'saveEnabled' => $enabled, 'shareEnabled' => $enabled],
            'compare-plans:banner', 'compare-plans:comparison', 'compare-plans:actions', 'compare-plans:notes', 'compare-plans:profile-import', 'refund-policy:banner', 'refund-policy:navigation' => collect(PublicPageContent::defaults($page)[$section])->mapWithKeys(fn ($value, $key) => [
                $key => is_bool($value) ? $enabled : (in_array($key, ['description', 'privacyNote', 'billingNote', 'note', 'dialogDescription', 'dialogBody'], true) ? $body : $text),
            ])->all(),
            'compare-plans:community', 'compare-plans:learning', 'compare-plans:career' => [
                'enabled' => $enabled, 'title' => $text, 'rows' => ['present', 'array', 'list', 'max:25'],
                'rows.*' => ['required', 'array:label,icon,free,plus,pro'],
                'rows.*.label' => $text,
                'rows.*.icon' => ['required', Rule::in(['BookOpen', 'BrainCircuit', 'BriefcaseBusiness', 'ChartNoAxesColumnIncreasing', 'FileText', 'IdCard', 'Link2', 'MessageCircle', 'RefreshCw', 'Settings', 'Shield', 'Trophy', 'UserRound', 'UsersRound', 'Eye', 'Target'])],
                'rows.*.free' => $text, 'rows.*.plus' => $text, 'rows.*.pro' => $text,
            ],
            'refund-policy:monthly-plan-payments', 'refund-policy:cancel-your-plan', 'refund-policy:payment-and-access-issues', 'refund-policy:consumer-rights' => [
                'title' => $text, 'navigationTitle' => $text,
                'paragraphs' => ['required', 'array', 'list', 'min:1', 'max:12'],
                'paragraphs.*' => ['required', 'array:text,linkLabel,href'], 'paragraphs.*.text' => $body,
                'paragraphs.*.linkLabel' => ['nullable', 'required_with:content.paragraphs.*.href', 'string', 'max:180'],
                'paragraphs.*.href' => ['nullable', 'required_with:content.paragraphs.*.linkLabel', 'string', 'max:2048', self::linkRule()],
            ],
            default => abort(404),
        };
        $top = array_filter(array_keys($fields), fn ($key) => ! str_contains($key, '.'));
        $rules['content'] = ['required', 'array:'.implode(',', $top)];
        foreach ($fields as $key => $rule) $rules['content.'.$key] = $rule;
        return $rules;
    }
}
