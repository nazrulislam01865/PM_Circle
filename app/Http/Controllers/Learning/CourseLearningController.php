<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Models\LearningCourseQuestion;
use App\Models\LearningCourseResource;
use App\Services\Learning\CourseAccess;
use App\Services\Learning\CourseLessonProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class CourseLearningController extends Controller
{
    public function index(Request $request, CurrentMemberPlan $plans, CourseLessonProgress $progress): Response
    {
        $member = $this->member($request);
        return Inertia::render('learning/MyLearning', [
            'courses' => $member ? $progress->enrolledCourses($member, $plans->code($member)) : [],
            'isMember' => (bool) $member,
        ]);
    }

    public function certificates(Request $request): Response
    {
        $member = $this->member($request);
        return Inertia::render('learning/Certificates', [
            'certificates' => $member ? DB::table('learning_course_certificates')->where('user_id', $member->id)
                ->orderByDesc('issued_at')->get()->map(fn ($row) => $this->certificateData($row))->all() : [],
            'isMember' => (bool) $member,
        ]);
    }

    public function certificate(Request $request, string $reference): Response
    {
        $row = DB::table('learning_course_certificates')->where('user_id', $request->user()->id)
            ->where('reference', $reference)->first();
        abort_unless($row, 404);
        return Inertia::render('learning/CertificateShow', [
            'certificate' => $this->certificateData($row), 'print' => $request->boolean('print'),
        ]);
    }

    public function show(Request $request, string $course, int $lesson, CurrentMemberPlan $plans, CourseAccess $access, CourseLessonProgress $progress): Response
    {
        $record = $this->course($course);
        $lessons = $progress->lessons($record);
        $current = $lessons[$lesson - 1] ?? null;
        abort_unless($current, 404);
        // Public lesson titles are already present in the public course outline.
        // Only enrolled, entitled members receive private material or progress.
        $enrolled = $access->canRead($request, $record, $plans);
        if (! $enrolled) {
            return Inertia::render('learning/Lesson', [
                'course' => [...$record->catalogData(), 'overview' => $record->overview, 'objectives' => $record->objectives ?? []],
                'lesson' => ['title' => $current['title'], 'position' => $lesson, 'completed' => false, 'body' => '', 'key' => ''],
                'progress' => $progress->summary($lessons, collect()), 'notes' => '', 'question' => null, 'resources' => [],
                'canRead' => false,
            ]);
        }
        $records = $progress->records($request->user(), $record->id);
        $summary = $progress->summary($lessons, $records);
        $question = $record->practice_enabled ? $this->question($record, $current)->first(['id', 'prompt', 'options']) : null;
        $resources = LearningCourseResource::query()->where('course_id', $record->id)->where('is_published', true)
            ->orderBy('section_title')->orderBy('title')->get(['id', 'title', 'section_title', 'description', 'kind', 'original_name'])
            ->map(fn ($resource) => ['id' => $resource->id, 'title' => $resource->title, 'section' => $resource->section_title,
                'description' => $resource->description, 'kind' => $resource->kind,
                'isPdf' => $resource->kind === 'file' && strtolower(pathinfo($resource->original_name ?? '', PATHINFO_EXTENSION)) === 'pdf'])->all();
        return Inertia::render('learning/Lesson', [
            'course' => [...$record->catalogData(), 'overview' => $record->overview, 'objectives' => $record->objectives ?? []],
            'lesson' => [...$current, 'position' => $lesson, 'completed' => $summary['lessons'][$lesson - 1]['completed']],
            'progress' => $summary, 'notes' => $records->get($current['key'])?->notes ?? '',
            'question' => $question ? ['id' => $question->id, 'prompt' => $question->prompt, 'options' => $question->options] : null,
            'resources' => $resources, 'canRead' => true,
        ]);
    }

    public function complete(Request $request, string $course, int $lesson, CurrentMemberPlan $plans, CourseAccess $access, CourseLessonProgress $progress): JsonResponse
    {
        [$record, $current] = $this->authorizedLesson($request, $course, $lesson, $plans, $access, $progress);
        return response()->json($progress->complete($request->user(), $record, $current['key']));
    }

    public function notes(Request $request, string $course, int $lesson, CurrentMemberPlan $plans, CourseAccess $access, CourseLessonProgress $progress): JsonResponse
    {
        [$record, $current] = $this->authorizedLesson($request, $course, $lesson, $plans, $access, $progress);
        $data = $request->validate(['notes' => ['nullable', 'string', 'max:10000']]);
        $progress->saveNotes($request->user(), $record, $current['key'], $data['notes'] ?? null);
        return response()->json(['message' => 'Notes saved.']);
    }

    public function check(Request $request, string $course, int $lesson, CurrentMemberPlan $plans, CourseAccess $access, CourseLessonProgress $progress): JsonResponse
    {
        [$record, $current] = $this->authorizedLesson($request, $course, $lesson, $plans, $access, $progress);
        abort_unless($record->practice_enabled, 403);
        $data = $request->validate(['question' => ['required', 'integer'], 'option' => ['required', 'in:A,B,C,D']]);
        $question = $this->question($record, $current)->whereKey($data['question'])->firstOrFail();
        return response()->json(['correct' => $question->correct_option === $data['option'], 'correctOption' => $question->correct_option,
            'explanation' => $question->explanation]);
    }

    private function member(Request $request): ?\App\Models\User
    {
        $user = $request->user();
        return $user && ! $user->is_admin && $user->onboarding_step >= 3 && $user->hasVerifiedEmail() ? $user : null;
    }

    private function course(string $slug): LearningCourse
    {
        return LearningCourse::query()->where('slug', $slug)->where('is_published', true)->firstOrFail();
    }

    private function authorizedLesson(Request $request, string $course, int $position, CurrentMemberPlan $plans, CourseAccess $access, CourseLessonProgress $progress): array
    {
        $record = $this->course($course);
        $access->ensureEnrolled($request, $record, $plans);
        $data = $request->validate(['lessonKey' => ['required', 'string', 'size:64']]);
        $current = $progress->lessons($record)[$position - 1] ?? null;
        abort_unless($current && hash_equals($current['key'], $data['lessonKey']), 409, 'This lesson has changed. Reload the page.');
        return [$record, $current];
    }

    private function question(LearningCourse $course, array $lesson): \Illuminate\Database\Eloquent\Builder
    {
        return LearningCourseQuestion::query()->where('course_id', $course->id)->where('is_published', true)
            ->where('topic_title', $lesson['title'])->orderBy('id');
    }

    private function certificateData(object $row): array
    {
        return ['reference' => $row->reference, 'memberName' => $row->member_name, 'courseTitle' => $row->course_title,
            'issuedAt' => Carbon::parse($row->issued_at)->timezone(config('app.timezone'))->format('j F Y')];
    }
}
