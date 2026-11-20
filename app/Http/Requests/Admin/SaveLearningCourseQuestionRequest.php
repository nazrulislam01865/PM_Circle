<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Support\Admin\CourseMasterData;

final class SaveLearningCourseQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        $outline = $this->route('course')->outline ?? [];
        $sections = collect($outline)->pluck('title')->all();
        $topics = collect($outline)->firstWhere('title', $this->input('section_title'))['topics'] ?? [];
        $current = $this->route('question');
        $choices = CourseMasterData::values($current ? [
            'course_question_kind' => $current->kind,
            'course_question_difficulty' => $current->difficulty,
        ] : []);

        return [
            'code' => ['required', 'string', 'regex:/^[a-zA-Z0-9_-]+$/', 'max:70'],
            'section_title' => ['required', 'string', 'max:200', Rule::in($sections)],
            'topic_title' => ['required', 'string', 'max:200', Rule::in($topics)],
            'kind' => ['required', Rule::in(array_intersect($choices['course_question_kind'], ['question', 'scenario']))],
            'difficulty' => ['required', Rule::in(array_intersect($choices['course_question_difficulty'], ['Easy', 'Moderate', 'Hard']))],
            'prompt' => ['required', 'string', 'max:10000'],
            'options' => ['required', 'array'],
            'options.A' => ['required', 'string', 'max:3000'],
            'options.B' => ['required', 'string', 'max:3000'],
            'options.C' => ['required', 'string', 'max:3000'],
            'options.D' => ['required', 'string', 'max:3000'],
            'correct_option' => ['required', Rule::in(['A', 'B', 'C', 'D'])],
            'explanation' => ['nullable', 'string', 'max:20000'],
            'is_published' => ['required', 'boolean'],
        ];
    }
}
