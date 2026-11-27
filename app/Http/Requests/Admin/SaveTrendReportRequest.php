<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

final class SaveTrendReportRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->is_admin === true; }

    public function rules(): array
    {
        $image = ['bail', 'nullable', 'string', 'max:2048', function ($attribute, $value, $fail) {
            $prefix = Storage::disk('public')->url('homepage/');
            if (preg_match('~^/images/trends/[a-zA-Z0-9_-]+\.webp$~D', $value)) return;
            if (str_starts_with($value, $prefix) && preg_match('~^[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$~Di', substr($value, strlen($prefix)))) return;
            $fail('Use a bundled report image or an image uploaded through this editor.');
        }];
        $short = ['nullable', 'string', 'max:180'];
        $body = ['nullable', 'string', 'max:20000'];
        return [
            'revision' => ['required', 'integer', 'min:0'],
            'slug' => ['required', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', Rule::unique('trend_articles', 'slug')->ignore((int) $this->route('report'))],
            'title' => ['required', 'string', 'max:180'], 'summary' => ['required', 'string', 'max:2000'],
            'category' => ['required', 'string', 'max:80', 'not_in:all,All,__pm_circle_dropdown_clear_selection__'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])], 'listed' => ['required', 'boolean'],
            'body_markdown' => ['nullable', 'string', 'max:50000'],
            'presentation' => ['required', 'array:articleTitle,articleLead,articleCategoryLabel,readMinutes,thumbnail,hero,attribution,intro,sources'],
            'presentation.articleTitle' => $short, 'presentation.articleLead' => ['nullable', 'string', 'max:2000'],
            'presentation.articleCategoryLabel' => $short, 'presentation.readMinutes' => ['required', 'integer', 'min:1', 'max:120'],
            'presentation.thumbnail' => $image, 'presentation.hero' => $image, 'presentation.attribution' => $short, 'presentation.intro' => $body,
            'presentation.sources' => ['present', 'array', 'max:20'], 'presentation.sources.*' => ['required', 'array:title,url,reportTitle,description'],
            'presentation.sources.*.title' => ['required', 'string', 'max:180'], 'presentation.sources.*.url' => ['required', 'url:https', 'max:2048', UpdatePublicPageRequest::linkRule()],
            'presentation.sources.*.reportTitle' => $short, 'presentation.sources.*.description' => ['nullable', 'string', 'max:2000'],
            'sections' => ['present', 'array', 'max:30'], 'sections.*' => ['required', 'array:title,text,bullets,chart,image,imageAlt'],
            'sections.*.title' => $short, 'sections.*.text' => $body, 'sections.*.bullets' => ['sometimes', 'array', 'max:30'],
            'sections.*.bullets.*' => ['required', 'string', 'max:1000'], 'sections.*.chart' => $image, 'sections.*.image' => $image, 'sections.*.imageAlt' => $short,
        ];
    }
}
