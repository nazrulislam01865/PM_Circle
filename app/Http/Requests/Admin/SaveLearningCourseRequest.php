<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Admin\CourseMasterData;

final class SaveLearningCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('course_payload')) {
            return;
        }
        $payload = $this->input('course_payload');
        if (! is_string($payload) || strlen($payload) > 12000000) {
            throw \Illuminate\Validation\ValidationException::withMessages(['course_payload' => 'Course content exceeds the allowed size.']);
        }
        try {
            $decoded = json_decode($payload, true, 64, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw \Illuminate\Validation\ValidationException::withMessages(['course_payload' => 'Invalid course data.']);
        }
        if (! is_array($decoded) || array_is_list($decoded)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['course_payload' => 'Invalid course data.']);
        }
        // Nested lecture and curriculum fields are JSON to avoid PHP max_input_vars truncation.
        $this->merge(array_intersect_key($decoded, array_flip([
            'title', 'summary', 'overview', 'category', 'level', 'minutes', 'access_tier', 'is_published', 'certificate_enabled', 'sort_order', 'presentation', 'objectives', 'outline', 'lessons',
        ])));
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            $outline = collect($this->input('outline', []))->keyBy('title');
            foreach ($this->input('outline', []) as $index => $section) {
                if (count(array_unique(array_map(fn ($topic) => mb_strtolower(trim($topic)), $section['topics']))) !== count($section['topics'])) {
                    $validator->errors()->add("outline.{$index}.topics", 'Each topic in a section must have a unique name.');
                }
            }
            foreach ($this->input('lessons', []) as $index => $lesson) {
                $section = $lesson['section_title'] ?? null;
                $topic = $lesson['topic_title'] ?? null;
                if (($section || $topic) && (! $section || ! $topic || ! in_array($topic, $outline->get($section)['topics'] ?? [], true))) {
                    $validator->errors()->add("lessons.{$index}.topic_title", 'Select a topic from the selected curriculum section.');
                }
            }
        });
    }

    public function rules(): array
    {
        $course = $this->route('course');
        $choices = CourseMasterData::values($course ? [
            'course_category' => $course->category,
            'course_level' => $course->level,
            'course_access' => $course->access_tier,
        ] : []);

        return [
            'title' => ['required', 'string', 'max:180'],
            'summary' => ['required', 'string', 'max:1000'],
            'overview' => ['required', 'string', 'max:10000'],
            'category' => ['required', 'string', 'max:100', Rule::in($choices['course_category'])],
            'level' => ['required', 'string', 'max:20', Rule::in($choices['course_level'])],
            'minutes' => ['required', 'integer', 'between:1,100000'],
            'access_tier' => ['required', Rule::in(array_intersect($choices['course_access'], ['free', 'paid']))],
            'is_published' => ['required', 'boolean'],
            'certificate_enabled' => ['sometimes', 'required', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'between:0,100000'],
            'presentation' => ['sometimes', 'array:type,tags,provider_name,provider_description,faq,practice_examples'],
            'presentation.type' => ['required_with:presentation', 'in:Professional development,Certification preparation'],
            'presentation.tags' => ['sometimes', 'array', 'list', 'max:12'],
            'presentation.tags.*' => ['required', 'string', 'max:80', 'distinct:ignore_case'],
            'presentation.provider_name' => ['required_with:presentation', 'string', 'max:120'],
            'presentation.provider_description' => ['required_with:presentation', 'string', 'max:1000'],
            'presentation.faq' => ['sometimes', 'array', 'list', 'max:20'],
            'presentation.faq.*' => ['array:question,answer'],
            'presentation.faq.*.question' => ['required', 'string', 'max:200'],
            'presentation.faq.*.answer' => ['required', 'string', 'max:2000'],
            'presentation.practice_examples' => ['sometimes', 'array', 'list', 'max:10'],
            'presentation.practice_examples.*' => ['array:question,answer'],
            'presentation.practice_examples.*.question' => ['required', 'string', 'max:500'],
            'presentation.practice_examples.*.answer' => ['required', 'string', 'max:3000'],
            'objectives' => ['required', 'array', 'list', 'min:1', 'max:30'],
            'objectives.*' => ['required', 'string', 'max:300'],
            'outline' => ['required', 'array', 'list', 'min:1', 'max:40'],
            'outline.*' => ['array:title,topics'],
            'outline.*.title' => ['required', 'string', 'max:200', 'distinct:ignore_case'],
            'outline.*.topics' => ['required', 'array', 'list', 'min:1', 'max:40'],
            'outline.*.topics.*' => ['required', 'string', 'max:200'],
            'lessons' => ['required', 'array', 'list', 'min:1', 'max:100'],
            'lessons.*' => ['array:uid,section_title,topic_title,title,body,video_url,takeaway,when_to_apply,example,application,references,faq'],
            'lessons.*.uid' => ['nullable', 'uuid', 'distinct'],
            'lessons.*.section_title' => ['nullable', 'string', 'max:200'],
            'lessons.*.topic_title' => ['nullable', 'string', 'max:200'],
            'lessons.*.title' => ['required', 'string', 'max:200'],
            'lessons.*.body' => ['required', 'string', 'max:20000'],
            'lessons.*.video_url' => ['nullable', 'url:https', 'max:2000'],
            'lessons.*.takeaway' => ['nullable', 'string', 'max:5000'],
            'lessons.*.when_to_apply' => ['nullable', 'string', 'max:5000'],
            'lessons.*.example' => ['nullable', 'string', 'max:5000'],
            'lessons.*.application' => ['nullable', 'string', 'max:5000'],
            'lessons.*.faq' => ['sometimes', 'array', 'list', 'max:20'],
            'lessons.*.faq.*' => ['array:question,answer'],
            'lessons.*.faq.*.question' => ['required', 'string', 'max:300'],
            'lessons.*.faq.*.answer' => ['required', 'string', 'max:3000'],
            'lessons.*.references' => ['nullable', 'string', 'max:5000'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ];
    }
}
