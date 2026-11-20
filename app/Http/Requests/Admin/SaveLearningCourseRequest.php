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
            'objectives' => ['required', 'array', 'min:1', 'max:30'],
            'objectives.*' => ['required', 'string', 'max:300'],
            'outline' => ['required', 'array', 'min:1', 'max:40'],
            'outline.*.title' => ['required', 'string', 'max:200'],
            'outline.*.topics' => ['required', 'array', 'min:1', 'max:40'],
            'outline.*.topics.*' => ['required', 'string', 'max:200'],
            'lessons' => ['required', 'array', 'min:1', 'max:100'],
            'lessons.*.title' => ['required', 'string', 'max:200'],
            'lessons.*.body' => ['required', 'string', 'max:20000'],
            'cover_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ];
    }
}
