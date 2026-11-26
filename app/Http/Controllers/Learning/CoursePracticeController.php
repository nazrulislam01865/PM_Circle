<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Models\LearningCourse;
use App\Models\LearningCoursePracticeAttempt;
use App\Models\LearningCourseQuestion;
use App\Services\Learning\CourseAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class CoursePracticeController extends Controller
{
    public function start(Request $request, LearningCourse $course, CurrentMemberPlan $plans, CourseAccess $access): RedirectResponse
    {
        $access->ensureEnrolled($request, $course, $plans);
        abort_unless($course->practice_enabled, 403);
        $data = $request->validate([
            'section' => ['nullable', 'string', 'max:200'],
            'topic' => ['nullable', 'string', 'max:200'],
        ]);
        $section = trim($data['section'] ?? '') ?: null;
        $curriculum = collect($course->outline ?? []);
        if ($section !== null && ! $curriculum->contains('title', $section)) {
            throw ValidationException::withMessages(['section' => 'Choose a section from this course curriculum.']);
        }
        $topic = trim($data['topic'] ?? '') ?: null;
        if ($topic !== null && ($section === null || ! in_array($topic, $curriculum->firstWhere('title', $section)['topics'] ?? [], true))) {
            throw ValidationException::withMessages(['topic' => 'Choose a topic from the selected curriculum section.']);
        }
        $query = LearningCourseQuestion::query()->where('course_id', $course->id)->where('is_published', true);
        if ($section !== null) {
            $query->where('section_title', $section);
        }
        if ($topic !== null) {
            $query->where('topic_title', $topic);
        }
        $count = (int) $course->practice_question_count;
        // Check availability first so no exam silently runs with fewer questions than configured.
        if ((clone $query)->count() < $count) {
            throw ValidationException::withMessages(['section' => 'Not enough published questions for this practice. Ask an admin to add more or adjust the question count.']);
        }
        $selected = $query->inRandomOrder()->limit($count)->get([
            'id', 'code', 'kind', 'section_title', 'topic_title', 'prompt', 'options',
            'correct_option', 'explanation', 'scenario_text', 'scenario_video_url',
        ]);
        $snapshot = $selected->map(fn (LearningCourseQuestion $question) => [
            'id' => $question->id, 'code' => $question->code, 'kind' => $question->kind,
            'section' => $question->section_title, 'topic' => $question->topic_title,
            'prompt' => $question->prompt, 'options' => $question->options,
            'scenarioText' => $question->scenario_text, 'scenarioVideoUrl' => $question->scenario_video_url,
            'correct' => $question->correct_option, 'explanation' => $question->explanation,
        ])->all();
        $now = now();
        $attempt = LearningCoursePracticeAttempt::query()->create([
            'course_id' => $course->id, 'user_id' => $request->user()->id,
            'section_title' => $section, 'questions' => $snapshot, 'answers' => [],
            'status' => 'started', 'started_at' => $now,
            'expires_at' => $now->copy()->addMinutes($course->practice_duration_minutes),
        ]);
        return redirect()->route('learning.courses.practice.take', ['course' => $course->slug, 'attempt' => $attempt->id]);
    }

    public function take(Request $request, string $course, LearningCoursePracticeAttempt $attempt, CurrentMemberPlan $plans, CourseAccess $access): Response|RedirectResponse
    {
        $record = $this->courseAttempt($request, $course, $attempt, $plans, $access);
        if ($attempt->status !== 'started' || $attempt->expires_at->isPast()) {
            return redirect()->route('learning.courses.practice.result', ['course' => $record->slug, 'attempt' => $attempt->id]);
        }
        return Inertia::render('learning/CoursePractice', [
            'course' => ['title' => $record->title, 'slug' => $record->slug],
            'attempt' => [
                'id' => $attempt->id, 'expiresAt' => $attempt->expires_at->toIso8601String(),
                'serverNow' => now()->toIso8601String(), 'answers' => $attempt->answers ?? [],
                'questions' => array_map(static fn (array $question): array => [
                    'id' => $question['id'], 'kind' => $question['kind'], 'section' => $question['section'],
                    'topic' => $question['topic'], 'prompt' => $question['prompt'], 'options' => $question['options'],
                    'scenarioText' => $question['scenarioText'] ?? null, 'scenarioVideoUrl' => $question['scenarioVideoUrl'] ?? null,
                ], $attempt->questions),
            ],
        ]);
    }

    public function answer(Request $request, string $course, LearningCoursePracticeAttempt $attempt, CurrentMemberPlan $plans, CourseAccess $access): JsonResponse
    {
        $this->courseAttempt($request, $course, $attempt, $plans, $access);
        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'option' => ['nullable', 'in:A,B,C,D'],
        ]);
        return DB::transaction(function () use ($attempt, $data): JsonResponse {
            $attempt = LearningCoursePracticeAttempt::query()->lockForUpdate()->findOrFail($attempt->id);
            if ($attempt->status !== 'started' || $attempt->expires_at->isPast()) {
                return response()->json(['message' => 'Practice time has ended.'], 409);
            }
            if (! collect($attempt->questions)->contains('id', (int) $data['question_id'])) {
                return response()->json(['message' => 'Question does not belong to this attempt.'], 422);
            }
            $answers = $attempt->answers ?? [];
            $key = (string) $data['question_id'];
            if (! empty($data['option'])) {
                $answers[$key] = $data['option'];
            } else {
                unset($answers[$key]);
            }
            $attempt->update(['answers' => $answers]);
            return response()->json(['saved' => true]);
        });
    }

    public function submit(Request $request, string $course, LearningCoursePracticeAttempt $attempt, CurrentMemberPlan $plans, CourseAccess $access): RedirectResponse
    {
        $record = $this->courseAttempt($request, $course, $attempt, $plans, $access);
        DB::transaction(function () use ($attempt): void {
            $attempt = LearningCoursePracticeAttempt::query()->lockForUpdate()->findOrFail($attempt->id);
            if ($attempt->status !== 'started') {
                return;
            }
            // Answers are saved before the deadline; score them even when the timer expires.
            $status = $attempt->expires_at->isPast() ? 'expired' : 'submitted';
            $attempt->update(['status' => $status, 'score' => $this->grade($attempt), 'submitted_at' => now()]);
        }, 3);
        return redirect()->route('learning.courses.practice.result', ['course' => $record->slug, 'attempt' => $attempt->id]);
    }

    public function result(Request $request, string $course, LearningCoursePracticeAttempt $attempt, CurrentMemberPlan $plans, CourseAccess $access): Response
    {
        $record = $this->courseAttempt($request, $course, $attempt, $plans, $access);
        if ($attempt->status === 'started' && $attempt->expires_at->isPast()) {
            DB::transaction(function () use ($attempt): void {
                $locked = LearningCoursePracticeAttempt::query()->lockForUpdate()->findOrFail($attempt->id);
                if ($locked->status === 'started' && $locked->expires_at->isPast()) {
                    $locked->update(['status' => 'expired', 'score' => $this->grade($locked), 'submitted_at' => now()]);
                }
            }, 3);
            $attempt->refresh();
        }
        abort_unless($attempt->status !== 'started', 404);
        $questions = array_map(static fn (array $question): array => [
            'id' => $question['id'], 'kind' => $question['kind'], 'section' => $question['section'],
            'topic' => $question['topic'], 'prompt' => $question['prompt'], 'options' => $question['options'],
                    'scenarioText' => $question['scenarioText'] ?? null, 'scenarioVideoUrl' => $question['scenarioVideoUrl'] ?? null,
            'correct' => $question['correct'], 'explanation' => $question['explanation'],
        ], $attempt->questions);
        return Inertia::render('learning/CoursePracticeResult', [
            'course' => ['title' => $record->title, 'slug' => $record->slug],
            'attempt' => [
                'id' => $attempt->id, 'status' => $attempt->status,
                'score' => $attempt->score, 'total' => count($questions),
                'answers' => $attempt->answers ?? [], 'questions' => $questions,
            ],
        ]);
    }

    private function grade(LearningCoursePracticeAttempt $attempt): int
    {
        $answers = $attempt->answers ?? [];
        $score = 0;
        foreach ($attempt->questions as $question) {
            if (($answers[(string) $question['id']] ?? null) === $question['correct']) {
                $score++;
            }
        }
        return $score;
    }

    private function courseAttempt(Request $request, string $slug, LearningCoursePracticeAttempt $attempt, CurrentMemberPlan $plans, CourseAccess $access): LearningCourse
    {
        $course = LearningCourse::query()->where('slug', $slug)->firstOrFail();
        abort_unless($attempt->course_id === $course->id && $attempt->user_id === $request->user()->id, 404);
        $access->ensureEnrolled($request, $course, $plans);
        return $course;
    }
}
