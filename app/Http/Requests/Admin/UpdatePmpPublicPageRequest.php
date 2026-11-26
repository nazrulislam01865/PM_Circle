<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Illuminate\Support\Facades\Storage;
use App\Support\Admin\HomepageMasterData;

final class UpdatePmpPublicPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin === true;
    }

    public function rules(): array
    {
        $text = ['required', 'string', 'max:180'];
        $body = ['required', 'string', 'max:2000'];
        $icon = ['nullable', 'string', 'max:1024', function (string $name, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') return;
            if (! is_string($value)) { $fail('Choose a valid uploaded image.'); return; }
            $prefix = Storage::disk('public')->url('homepage/');
            $filename = str_starts_with($value, $prefix) ? substr($value, strlen($prefix)) : '';
            $isUploaded = preg_match('~^[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $filename) === 1;
            $isBundled = preg_match('~^/images/exam/public/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp)$~D', $value) === 1;
            if (! $isUploaded && ! $isBundled) {
                $fail('Choose an icon uploaded through the admin editor or a bundled PMP image.');
            }
        }];
        $https = ['required', 'string', 'url:http,https', 'max:2048', function (string $name, mixed $value, \Closure $fail): void {
            if (! is_string($value) || ! str_starts_with($value, 'https://')) {
                $fail('Use an HTTPS URL.');
            }
        }];

        return [
            'version' => ['required', 'integer', 'min:0'],
            'content' => ['required', 'array:sections,hero,benefits,sample,ai,plans,faq,video,testimonials,footer'],
            'content.sections' => ['required', 'array:hero,benefits,sample,ai,plans,faq,video,testimonials,footer'],
            'content.sections.*' => ['required', 'boolean'],
            'content.hero' => ['required', 'array:title,description,image,primary_label,secondary_label'],
            'content.hero.title' => $text,
            'content.hero.description' => $body,
            'content.hero.image' => $icon,
            'content.hero.primary_label' => $text,
            'content.hero.secondary_label' => $text,
            'content.benefits' => ['required', 'array:heading,cards'],
            'content.benefits.heading' => $text,
            'content.benefits.cards' => ['required', 'array', 'size:4'],
            'content.benefits.cards.*' => ['required', 'array:title,description,icon,icon_image'],
            'content.benefits.cards.*.title' => $text,
            'content.benefits.cards.*.description' => $body,
            'content.benefits.cards.*.icon' => ['required', Rule::in(['clipboard-check', 'calendar-days', 'users-round', 'book-open', 'bot', 'file-search', 'sparkles'])],
            'content.benefits.cards.*.icon_image' => $icon,
            'content.sample' => ['required', 'array:heading,description,icon_image,question_id'],
            'content.sample.heading' => $text,
            'content.sample.description' => $body,
            'content.sample.icon_image' => $icon,
            'content.sample.question_id' => ['nullable'],
            'content.ai' => ['required', 'array:heading,description,icon_image,cards'],
            'content.ai.heading' => $text,
            'content.ai.description' => $body,
            'content.ai.icon_image' => $icon,
            'content.ai.cards' => ['required', 'array', 'size:4'],
            'content.ai.cards.*' => ['required', 'array:title,description,icon,icon_image'],
            'content.ai.cards.*.title' => $text,
            'content.ai.cards.*.description' => $body,
            'content.ai.cards.*.icon' => ['required', Rule::in(['clipboard-check', 'calendar-days', 'users-round', 'book-open', 'bot', 'file-search', 'sparkles'])],
            'content.ai.cards.*.icon_image' => $icon,
            'content.plans' => ['required', 'array:heading,description,icon_image,first_column,columns,rows,price_note,checkout_note'],
            'content.plans.heading' => $text,
            'content.plans.description' => $body,
            'content.plans.icon_image' => $icon,
            'content.plans.first_column' => $text,
            'content.plans.columns' => ['required', 'array', 'size:4'],
            'content.plans.columns.*' => ['required', 'array:title,subtitle,action'],
            'content.plans.columns.*.title' => $text,
            'content.plans.columns.*.subtitle' => ['nullable', 'string', 'max:100'],
            'content.plans.columns.*.action' => $text,
            'content.plans.rows' => ['required', 'array', 'min:1', 'max:'.\App\Support\Exam\PmpPublicContent::MAX_PLAN_ROWS],
            'content.plans.rows.*' => ['required', 'array:label,type,values'],
            'content.plans.rows.*.label' => $text,
            'content.plans.rows.*.type' => ['required', Rule::in(['text', 'checkbox'])],
            'content.plans.rows.*.values' => ['required', 'array', 'size:4'],
            'content.plans.price_note' => $body,
            'content.plans.checkout_note' => $body,
            'content.faq' => ['required', 'array:heading,items'],
            'content.faq.heading' => $text,
            'content.faq.items' => ['required', 'array', 'min:1', 'max:12'],
            'content.faq.items.*' => ['required', 'array:question,answer'],
            'content.faq.items.*.question' => $text,
            'content.faq.items.*.answer' => $body,
            'content.video' => ['required', 'array:heading,video_url,feedback_heading,points'],
            'content.video.heading' => $text,
            'content.video.video_url' => $https,
            'content.video.feedback_heading' => $text,
            'content.video.points' => ['required', 'array', 'min:1', 'max:4'],
            'content.video.points.*' => ['required', 'array:title,description,icon,icon_image'],
            'content.video.points.*.title' => $text,
            'content.video.points.*.description' => $body,
            'content.video.points.*.icon' => ['required', Rule::in(['clipboard-check', 'calendar-days', 'users-round', 'book-open', 'bot', 'file-search', 'sparkles'])],
            'content.video.points.*.icon_image' => $icon,
            'content.testimonials' => ['required', 'array:heading,items'],
            'content.testimonials.heading' => $text,
            'content.testimonials.items' => ['required', 'array', 'min:1', 'max:8'],
            'content.testimonials.items.*' => ['required', 'array:name,role,quote,image'],
            'content.testimonials.items.*.name' => $text,
            'content.testimonials.items.*.role' => $text,
            'content.testimonials.items.*.quote' => $body,
            'content.testimonials.items.*.image' => $icon,
            'content.footer' => ['exclude'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            $rows = $this->input('content.plans.rows', []);
            if (! is_array($rows)) return;
            foreach ($rows as $index => $row) {
                if (! is_array($row) || ! is_array($row['values'] ?? null)) {
                    continue;
                }
                foreach ($row['values'] as $column => $value) {
                    if (($row['type'] ?? '') === 'checkbox' && ! is_bool($value)) {
                        $validator->errors()->add("content.plans.rows.$index.values.$column", 'Choose the checkbox state.');
                    }
                    if (($row['type'] ?? '') === 'text' && (! is_string($value) || mb_strlen($value) > 200)) {
                        $validator->errors()->add("content.plans.rows.$index.values.$column", 'Enter text of at most 200 characters.');
                    }
                }
            }
        }];
    }
}
