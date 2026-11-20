<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveLearningCourseQuestionRequest;
use App\Http\Requests\Admin\SaveLearningCourseResourceRequest;
use App\Models\LearningCourse;
use App\Models\LearningCourseQuestion;
use App\Models\LearningCourseResource;
use App\Support\Admin\CourseMasterData;
use App\Services\Learning\CourseQuestionImporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

final class LearningCourseContentController extends Controller
{
    public function index(Request $request, LearningCourse $course): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'section' => ['nullable', 'string', 'max:200'],
            'type' => ['nullable', Rule::in(['all', 'question', 'scenario'])],
        ]);
        $search = trim($filters['search'] ?? '');
        $section = $filters['section'] ?? '';
        $type = $filters['type'] ?? 'all';
        $query = LearningCourseQuestion::query()->where('course_id', $course->id);
        if ($search !== '') {
            $query->where(fn ($q) => $q->whereRaw('LOWER(code) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(prompt) LIKE ?', ['%'.mb_strtolower($search).'%']));
        }
        if ($section !== '') {
            $query->where('section_title', $section);
        }
        if ($type !== 'all') {
            $query->where('kind', $type);
        }
        $questions = $query->orderByDesc('id')->paginate(15, [
            'id', 'code', 'section_title', 'topic_title', 'kind', 'difficulty', 'prompt',
            'options', 'correct_option', 'explanation', 'is_published',
        ], 'page')->withQueryString();
        $resources = LearningCourseResource::query()->where('course_id', $course->id)
            ->orderByDesc('id')->paginate(15, [
                'id', 'title', 'section_title', 'description', 'kind', 'url',
                'original_name', 'is_published',
            ], 'resources_page')->withQueryString();
        $counts = LearningCourseQuestion::query()->where('course_id', $course->id)
            ->selectRaw('COUNT(*) as total, SUM(CASE WHEN is_published THEN 1 ELSE 0 END) AS published')
            ->first();

        return Inertia::render('admin/LearningCourseContent', [
            'course' => [
                'id' => $course->id, 'slug' => $course->slug, 'title' => $course->title,
                'outline' => $course->outline ?? [], 'practiceEnabled' => $course->practice_enabled,
                'practiceQuestionCount' => $course->practice_question_count,
                'practiceDurationMinutes' => $course->practice_duration_minutes,
            ],
            'questions' => $questions,
            'resources' => $resources,
            'stats' => ['total' => (int) ($counts->total ?? 0), 'published' => (int) ($counts->published ?? 0)],
            'filters' => ['search' => $search, 'section' => $section, 'type' => $type],
            'dropdowns' => CourseMasterData::options(),
        ]);
    }

    public function settings(Request $request, LearningCourse $course): RedirectResponse
    {
        $data = $request->validate([
            'practice_enabled' => ['required', 'boolean'],
            'practice_question_count' => ['required', 'integer', 'between:1,100'],
            'practice_duration_minutes' => ['required', 'integer', 'between:1,240'],
        ]);
        $course->update($data);
        return back()->with('status', 'Practice settings saved.');
    }

    public function question(SaveLearningCourseQuestionRequest $request, LearningCourse $course): RedirectResponse
    {
        $data = $request->validated();
        $exists = LearningCourseQuestion::query()->where('course_id', $course->id)
            ->where('code', $data['code'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['code' => 'Question ID already exists for this course.']);
        }
        $course->questions()->create($data);
        return back()->with('status', 'Question added.');
    }

    public function updateQuestion(SaveLearningCourseQuestionRequest $request, LearningCourse $course, LearningCourseQuestion $question): RedirectResponse
    {
        abort_unless($question->course_id === $course->id, 404);
        $data = $request->validated();
        if (LearningCourseQuestion::query()->where('course_id', $course->id)
            ->where('code', $data['code'])->whereKeyNot($question->id)->exists()) {
            throw ValidationException::withMessages(['code' => 'Question ID already exists for this course.']);
        }
        $question->update($data);
        return back()->with('status', 'Question updated. Existing practice attempts remain unchanged.');
    }

    public function questionStatus(LearningCourse $course, LearningCourseQuestion $question): RedirectResponse
    {
        abort_unless($question->course_id === $course->id, 404);
        $question->update(['is_published' => ! $question->is_published]);
        return back()->with('status', $question->is_published ? 'Question published.' : 'Question moved to draft.');
    }

    public function import(Request $request, LearningCourse $course, CourseQuestionImporter $importer): RedirectResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xlsx', 'max:5120'],
            'publish_all' => ['required', 'boolean'],
        ]);
        $count = $importer->import($course, $data['file'], (bool) $data['publish_all']);
        return back()->with('status', "Imported {$count} questions successfully.");
    }

    public function template(): BinaryFileResponse
    {
        return response()->download(resource_path('templates/learning-course-questions.xlsx'), 'PM_Circle_Course_Question_Template.xlsx');
    }

    public function resource(SaveLearningCourseResourceRequest $request, LearningCourse $course): RedirectResponse
    {
        $data = $request->safe()->except('file');
        $file = $request->file('file');
        $path = $file?->store('learning/course-resources/'.$course->id, 'local');
        if ($file && ! $path) {
            throw ValidationException::withMessages(['file' => 'Could not save the resource file.']);
        }
        try {
            $course->resources()->create([
                ...$data, 'url' => $data['kind'] === 'link' ? $data['url'] : null,
                'file_path' => $path, 'original_name' => $file?->getClientOriginalName(),
            ]);
        } catch (Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
        return back()->with('status', 'Resource added.');
    }

    public function updateResource(SaveLearningCourseResourceRequest $request, LearningCourse $course, LearningCourseResource $resource): RedirectResponse
    {
        abort_unless($resource->course_id === $course->id, 404);
        $data = $request->safe()->except('file');
        $file = $request->file('file');
        $path = $file?->store('learning/course-resources/'.$course->id, 'local');
        if ($file && ! $path) {
            throw ValidationException::withMessages(['file' => 'Could not store replacement file.']);
        }
        $previous = $resource->file_path;
        try {
            $resource->update([
                ...$data,
                'url' => $data['kind'] === 'link' ? $data['url'] : null,
                'file_path' => $data['kind'] === 'file' ? ($path ?: $previous) : null,
                'original_name' => $data['kind'] === 'file' ? ($file?->getClientOriginalName() ?: $resource->original_name) : null,
            ]);
        } catch (Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }
        if ($previous && ($path || $data['kind'] === 'link')) {
            Storage::disk('local')->delete($previous);
        }
        return back()->with('status', 'Resource updated.');
    }

    public function resourceStatus(LearningCourse $course, LearningCourseResource $resource): RedirectResponse
    {
        abort_unless($resource->course_id === $course->id, 404);
        $resource->update(['is_published' => ! $resource->is_published]);
        return back()->with('status', $resource->is_published ? 'Resource published.' : 'Resource moved to draft.');
    }
}
