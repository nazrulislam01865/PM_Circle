<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Admin\CourseMasterData;

final class SaveLearningCourseResourceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->filled('lesson_uid') && ! collect($this->route('course')->lessons ?? [])->contains(fn (array $lesson) => ($lesson['uid'] ?? null) === $this->input('lesson_uid') && (empty($lesson['section_title']) || $lesson['section_title'] === $this->input('section_title')))) {
                $validator->errors()->add('lesson_uid', 'Select a lesson belonging to this course and section.');
            }
            if ($this->input('kind') === 'link' && $this->hasFile('file')) {
                $validator->errors()->add('file', 'Remove the selected file when adding a link.');
            }
        });
    }

    public function rules(): array
    {
        $sections = collect($this->route('course')->outline ?? [])->pluck('title')->all();
        $kind = $this->input('kind');
        $existingFile = $this->route('resource')?->kind === 'file' && (bool) $this->route('resource')?->file_path;
        $choices = CourseMasterData::values($this->route('resource') ? [
            'course_resource_kind' => $this->route('resource')->kind,
        ] : []);

        return [
            'title' => ['required', 'string', 'max:200'],
            'section_title' => ['required', Rule::in($sections)],
            'lesson_uid' => ['nullable', 'uuid'],
            'description' => ['nullable', 'string', 'max:2000'],
            'kind' => ['required', Rule::in(array_intersect($choices['course_resource_kind'], ['link', 'file']))],
            'url' => [$kind === 'link' ? 'required' : 'nullable', 'url:http,https', 'max:2000'],
            'file' => [$kind === 'file' && ! $existingFile ? 'required' : 'nullable', 'file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx', 'extensions:pdf,doc,docx,ppt,pptx,xls,xlsx', 'max:10240'],
            'is_published' => ['required', 'boolean'],
        ];
    }
}
