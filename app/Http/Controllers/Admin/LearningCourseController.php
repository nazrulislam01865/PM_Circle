<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SaveLearningCourseRequest;
use App\Models\LearningCourse;
use App\Support\Admin\CourseMasterData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

final class LearningCourseController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:all,published,draft'],
        ]);
        $search = trim($filters['search'] ?? '');
        $status = $filters['status'] ?? 'all';

        $query = LearningCourse::query()->select([
            'id', 'slug', 'title', 'summary', 'category', 'level', 'minutes', 'thumbnail',
            'cover_path', 'access_tier', 'is_published', 'updated_at',
        ]);
        if ($search !== '') {
            $query->where(fn ($builder) => $builder
                ->whereRaw('LOWER(title) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(slug) LIKE ?', ['%'.mb_strtolower($search).'%'])
                ->orWhereRaw('LOWER(category) LIKE ?', ['%'.mb_strtolower($search).'%']));
        }
        if ($status !== 'all') {
            $query->where('is_published', $status === 'published');
        }

        $courses = $query->orderByDesc('updated_at')->orderByDesc('id')->paginate(15)->withQueryString();
        $courses->through(fn (LearningCourse $course) => [
            'id' => $course->id,
            ...$course->catalogData(),
            'isPublished' => $course->is_published,
            'updatedAt' => $course->updated_at?->format('M j, Y'),
        ]);
        $stats = LearningCourse::query()->selectRaw(
            'COUNT(*) AS total, SUM(CASE WHEN is_published THEN 1 ELSE 0 END) AS published'
        )->first();

        return Inertia::render('admin/LearningCourses', [
            'courses' => $courses,
            'stats' => ['total' => (int) $stats->total, 'published' => (int) $stats->published],
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/LearningCourseEditor', [
            'course' => null,
            'dropdowns' => CourseMasterData::options(),
        ]);
    }

    public function edit(LearningCourse $course): Response
    {
        return Inertia::render('admin/LearningCourseEditor', [
            'dropdowns' => CourseMasterData::options([
                'course_category' => $course->category,
                'course_level' => $course->level,
                'course_access' => $course->access_tier,
            ]),
            'course' => [
                'id' => $course->id,
                ...$course->catalogData(),
                'overview' => $course->overview,
                'presentation' => $course->presentationData(),
                'sortOrder' => $course->sort_order,
                'objectives' => $course->objectives ?? [],
                'outline' => $course->outline ?? [],
                'lessons' => $course->lessons ?? [],
                'isPublished' => $course->is_published,
            ],
        ]);
    }

    public function store(SaveLearningCourseRequest $request): RedirectResponse
    {
        $data = $this->courseData($request);
        $slug = Str::slug($data['title']);
        if ($slug === '' || strlen($slug) > 100 || LearningCourse::query()->where('slug', $slug)->exists()) {
            throw ValidationException::withMessages(['title' => 'Choose a different course title to create a unique link.']);
        }

        $cover = $request->file('cover_image')?->store('learning/course-covers', 'public');
        if ($request->hasFile('cover_image') && ! $cover) {
            throw ValidationException::withMessages(['cover_image' => 'Could not store the course image. Please retry.']);
        }
        try {
            $course = LearningCourse::query()->create([
                ...$data, 'slug' => $slug, 'cover_path' => $cover,
            ]);
        } catch (Throwable $exception) {
            if ($cover) {
                Storage::disk('public')->delete($cover);
            }
            throw $exception;
        }

        return redirect()->route('admin.learning-courses.content', $course)->with('status', 'Course created. Manage practice questions and lesson resources here.');
    }

    public function update(SaveLearningCourseRequest $request, LearningCourse $course): RedirectResponse
    {
        $data = $this->courseData($request);
        $cover = $request->file('cover_image')?->store('learning/course-covers', 'public');
        if ($request->hasFile('cover_image') && ! $cover) {
            throw ValidationException::withMessages(['cover_image' => 'Could not store the course image. Please retry.']);
        }
        $previousCover = null;
        try {
            DB::transaction(function () use ($course, $data, $cover, &$previousCover): void {
                $locked = LearningCourse::query()->whereKey($course->id)->lockForUpdate()->firstOrFail();
                $previousCover = $locked->cover_path;
                $this->ensureContentReferences($locked, $data);
                $locked->update([...$data, ...($cover ? ['cover_path' => $cover] : [])]);
            });
        } catch (Throwable $exception) {
            if ($cover) {
                Storage::disk('public')->delete($cover);
            }
            throw $exception;
        }
        if ($cover && $previousCover) {
            Storage::disk('public')->delete($previousCover);
        }

        return redirect()->route('admin.learning-courses.content', $course)->with('status', 'Course updated successfully.');
    }

    private function courseData(SaveLearningCourseRequest $request): array
    {
        $data = $request->safe()->except('cover_image');
        $existing = collect($request->route('course')?->lessons ?? [])->pluck('uid')->filter()->all();
        foreach ($data['lessons'] as &$lesson) {
            if (! in_array($lesson['uid'] ?? null, $existing, true)) {
                $lesson['uid'] = (string) Str::uuid();
            }
        }
        unset($lesson);
        if (isset($data['presentation'])) {
            $data['presentation'] = array_replace(['tags' => [], 'faq' => [], 'practice_examples' => []], $data['presentation']);
        }
        return $data;
    }

    private function ensureContentReferences(LearningCourse $course, array $data): void
    {
        $oldIds = array_filter(array_column($course->lessons ?? [], 'uid'));
        $removedIds = array_diff($oldIds, array_column($data['lessons'], 'uid'));
        if ($removedIds && ($course->resources()->whereIn('lesson_uid', $removedIds)->exists() || $course->questions()->whereIn('lesson_uid', $removedIds)->exists())) {
            throw ValidationException::withMessages(['lessons' => 'Move attached documents and questions before removing this lesson.']);
        }
        $oldOutline = collect($course->outline ?? [])->keyBy('title');
        $newOutline = collect($data['outline'])->keyBy('title');
        foreach ($oldOutline as $title => $section) {
            if (! $newOutline->has($title) && ($course->questions()->where('section_title', $title)->exists() || $course->resources()->where('section_title', $title)->exists())) {
                throw ValidationException::withMessages(['outline' => 'Move questions and resources from the removed or renamed section before saving.']);
            }
            $removedTopics = array_diff($section['topics'] ?? [], $newOutline->get($title)['topics'] ?? []);
            if ($removedTopics && $course->questions()->where('section_title', $title)->whereIn('topic_title', $removedTopics)->exists()) {
                throw ValidationException::withMessages(['outline' => 'Move practice questions to another topic before removing or renaming this topic.']);
            }
        }
        // Explicit lesson documents remain attached when a lecture is moved to another topic.
        $oldLessons = collect($course->lessons ?? [])->keyBy('uid');
        foreach ($data['lessons'] as $lesson) {
            $previous = $oldLessons->get($lesson['uid']);
            if ($previous && (($previous['section_title'] ?? null) !== ($lesson['section_title'] ?? null) || ($previous['topic_title'] ?? null) !== ($lesson['topic_title'] ?? null)) && $course->questions()->where('lesson_uid', $lesson['uid'])->exists()) {
                throw ValidationException::withMessages(['lessons' => 'Reassign lesson questions before changing this lesson’s section or topic.']);
            }
            if ($previous && ($previous['section_title'] ?? null) !== ($lesson['section_title'] ?? null)
                && ! empty($lesson['section_title'])) {
                $course->resources()->where('lesson_uid', $lesson['uid'])->update(['section_title' => $lesson['section_title']]);
            }
        }
    }

    public function toggle(LearningCourse $course): RedirectResponse
    {
        $course->update(['is_published' => ! $course->is_published]);

        return back()->with('status', $course->is_published ? 'Course published.' : 'Course moved to draft.');
    }
}
