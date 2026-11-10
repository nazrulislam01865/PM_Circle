<?php

namespace App\Http\Controllers\Interview;

use App\Domain\Dashboard\Queries\MemberShell;
use App\Domain\Interview\QuestionCatalog;
use App\Http\Controllers\Controller;
use App\Http\Requests\Interview\StartInterviewRequest;
use App\Http\Requests\Interview\SubmitAnswerRequest;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Authenticated interview screens. Every lookup is scoped to the current member. */
final class InterviewController extends Controller
{
    public function __construct()
    {
        abort_unless(config('pm-interview.enabled'), 404);
    }

    public function index(Request $request, MemberShell $shell): Response
    {
        $userId = $request->user()->id;
        $recent = DB::table('interview_sessions')->where('user_id', $userId)
            ->orderByDesc('id')->limit(4)->get(['id', 'industry', 'role', 'question_count', 'overall_score', 'status', 'completed_at']);
        $stats = DB::table('interview_sessions')->where('user_id', $userId)->where('status', 'completed')
            ->selectRaw('COUNT(*) as sessions, COALESCE(SUM(question_count), 0) as answered, MAX(completed_at) as last_completed')->first();

        return Inertia::render('interview/Index', [
            'shell' => $shell->forMember($request->user()),
            'industries' => QuestionCatalog::INDUSTRIES, 'roles' => QuestionCatalog::ROLES,
            'experience' => QuestionCatalog::EXPERIENCE, 'recent' => $recent,
            'minutesPerQuestion' => (int) config('pm-interview.minutes_per_question', 2),
            'stats' => ['sessions' => (int) $stats->sessions, 'answered' => (int) $stats->answered, 'last' => $stats->last_completed],
        ]);
    }

    public function start(StartInterviewRequest $request, QuestionCatalog $catalog): RedirectResponse
    {
        $data = $request->validated();
        $id = DB::table('interview_sessions')->insertGetId([
            'user_id' => $request->user()->id, 'industry' => $data['industry'],
            'role' => $data['role'], 'experience' => $data['experience'],
            'question_types' => json_encode($data['types'], JSON_THROW_ON_ERROR),
            'answer_mode' => $data['mode'],
            'questions' => json_encode($catalog->select($data['industry'], $data['role'], $data['experience'], $data['types'], $data['count']), JSON_THROW_ON_ERROR),
            'question_count' => $data['count'], 'created_at' => now(), 'updated_at' => now(),
        ]);
        return to_route('interview.practice', ['session' => $id]);
    }

    public function practice(Request $request, int $session, MemberShell $shell): Response|RedirectResponse
    {
        $record = $this->owned($request, $session);
        if ($record->status === 'completed') return to_route('interview.results.show', ['session' => $session]);
        $answers = DB::table('interview_answers')->where('interview_session_id', $session)
            ->orderBy('position')->get(['position', 'answer', 'mode', 'status', 'score', 'evaluation']);
        return Inertia::render('interview/Practice', [
            'shell' => $shell->forMember($request->user()),
            'session' => $this->sessionData($record),
            'questions' => json_decode($record->questions, true, 512, JSON_THROW_ON_ERROR),
            'answers' => $answers->map(fn ($a) => $this->answerData($a))->all(),
        ]);
    }

    /** Save a practice response immediately, without AI, credits, queues or extra polling. */
    public function submit(SubmitAnswerRequest $request, int $session): JsonResponse
    {
        $data = $request->validated();

        $answer = DB::transaction(function () use ($request, $session, $data) {
            $record = DB::table('interview_sessions')->where('id', $session)
                ->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless($record->status === 'in_progress', 409);
            abort_unless($data['position'] < $record->question_count, 422);
            // Typed answers remain available as a fallback when browser speech recognition is unavailable.
            abort_unless($record->answer_mode === 'both' || $record->answer_mode === $data['mode']
                || ($record->answer_mode === 'speak' && $data['mode'] === 'type'), 422);

            $prior = DB::table('interview_answers')->where('interview_session_id', $session)
                ->where('position', $data['position'])->first();
            // Preserve saved responses on exact retries. Updates replace an answer only
            // after the edited response has passed validation, without deleting the original.
            if ($prior && in_array($prior->status, ['submitted', 'pending', 'evaluated'], true)
                && trim($prior->answer) === trim($data['answer']) && $prior->mode === $data['mode']) {
                return $this->answerData($prior); // Exact retry: no duplicate writes.
            }

            if (! $prior) {
                $completed = DB::table('interview_answers')->where('interview_session_id', $session)
                    ->where('position', '<', $data['position'])
                    ->whereIn('status', ['submitted', 'pending', 'evaluated'])->count();
                if ($completed !== $data['position']) {
                    throw ValidationException::withMessages(['answer' => 'Complete previous questions before submitting this one.']);
                }
            }

            $values = [
                'answer' => trim($data['answer']), 'mode' => $data['mode'], 'status' => 'submitted',
                'score' => null, 'evaluation' => null, 'ai_model' => null,
                'input_tokens' => 0, 'output_tokens' => 0, 'evaluated_at' => null, 'updated_at' => now(),
            ];
            if ($prior) {
                DB::table('interview_answers')->where('id', $prior->id)->update($values);
            } else {
                DB::table('interview_answers')->insert($values + [
                    'interview_session_id' => $session, 'position' => $data['position'], 'created_at' => now(),
                ]);
            }

            return [
                'position' => $data['position'], 'answer' => trim($data['answer']),
                'mode' => $data['mode'], 'status' => 'submitted', 'score' => null, 'evaluation' => null,
            ];
        });

        return response()->json(['status' => 'submitted', 'answer' => $answer]);
    }

    public function answerStatus(Request $request, int $session, int $position): JsonResponse
    {
        $record = $this->owned($request, $session);
        abort_unless($position >= 0 && $position < $record->question_count, 404);
        $answer = DB::table('interview_answers')->where('interview_session_id', $session)
            ->where('position', $position)->first(['position', 'answer', 'mode', 'status', 'score', 'evaluation']);
        return response()->json(['answer' => $answer ? $this->answerData($answer) : null]);
    }

    public function retry(Request $request, int $session, int $position): JsonResponse
    {
        $record = $this->owned($request, $session);
        abort_unless($record->status === 'in_progress', 409);
        $updated = DB::table('interview_answers')->where('interview_session_id', $session)
            ->where('position', $position)->whereIn('status', ['submitted', 'pending', 'evaluated', 'failed'])->delete();
        abort_unless($updated, 409, 'This answer cannot be edited.');
        return response()->json(['reset' => true]);
    }

    public function finish(Request $request, int $session): JsonResponse
    {
        DB::transaction(function () use ($request, $session) {
            $record = DB::table('interview_sessions')->where('id', $session)
                ->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            if ($record->status === 'completed') return;
            $submitted = DB::table('interview_answers')->where('interview_session_id', $session)
                ->whereIn('status', ['submitted', 'pending', 'evaluated'])->count();
            if ($submitted !== $record->question_count) {
                throw ValidationException::withMessages(['answer' => 'Answer all questions before viewing your practice summary.']);
            }
            DB::table('interview_sessions')->where('id', $session)->update([
                'status' => 'completed',
                'completed_at' => now(), 'updated_at' => now(),
            ]);
        });
        return response()->json(['url' => route('interview.results.show', ['session' => $session])]);
    }

    public function results(Request $request, MemberShell $shell, ?int $session = null): Response
    {
        $rows = DB::table('interview_sessions')->where('user_id', $request->user()->id)
            ->where('status', 'completed')->orderByDesc('completed_at')->limit(30)
            ->get(['id', 'industry', 'role', 'question_count', 'overall_score', 'completed_at', 'created_at']);
        $selected = $session
            ? $rows->firstWhere('id', $session)
            : $rows->first();
        if ($session && ! $selected) {
            $selected = DB::table('interview_sessions')->where('id', $session)
                ->where('user_id', $request->user()->id)->where('status', 'completed')
                ->first(['id', 'industry', 'role', 'question_count', 'overall_score', 'completed_at', 'created_at']);
            abort_unless($selected, 404);
        }
        $answers = $selected ? DB::table('interview_answers')->where('interview_session_id', $selected->id)
            ->orderBy('position')->get(['position', 'answer', 'score', 'evaluation'])->map(fn ($a) => $this->answerData($a))->all() : [];
        $questions = $selected ? json_decode(DB::table('interview_sessions')->where('id', $selected->id)->value('questions'), true) : [];
        return Inertia::render('interview/Results', [
            'shell' => $shell->forMember($request->user()), 'history' => $rows,
            'selected' => $selected, 'answers' => $answers, 'questions' => $questions,
        ]);
    }

    private function owned(Request $request, int $session): object
    {
        return DB::table('interview_sessions')->where('id', $session)
            ->where('user_id', $request->user()->id)->firstOrFail();
    }

    private function sessionData(object $record): array
    {
        // The duration is a practice estimate, not an enforced deadline: users keep their
        // answers if their time runs out. Anchor the clock to the saved session start so
        // refreshes, background tabs and question changes never reset the countdown.
        $startedAt = CarbonImmutable::parse($record->created_at, config('app.timezone'));
        $serverNow = now()->toImmutable();
        // Question count determines the INITIAL allowance, never the time remaining.
        // The deadline is fixed for the whole session, regardless of answer submissions.
        $durationSeconds = $record->question_count * (int) config('pm-interview.minutes_per_question', 2) * 60;
        $deadlineAt = $startedAt->addSeconds($durationSeconds);
        $remainingSeconds = max(0, $serverNow->diffInSeconds($deadlineAt, false));

        return ['id' => $record->id, 'industry' => $record->industry, 'role' => $record->role,
            'experience' => $record->experience, 'count' => $record->question_count,
            'mode' => $record->answer_mode, 'status' => $record->status,
            'createdAt' => $startedAt->toIso8601String(), 'serverNow' => $serverNow->toIso8601String(),
            'deadlineAt' => $deadlineAt->toIso8601String(),
            'durationSeconds' => $durationSeconds, 'remainingSeconds' => (int) ceil($remainingSeconds)];
    }

    private function answerData(object $record): array
    {
        return ['position' => $record->position, 'answer' => $record->answer ?? null,
            'mode' => $record->mode ?? null, 'status' => in_array($record->status ?? '', ['pending', 'evaluated'], true) ? 'submitted' : ($record->status ?? 'submitted'),
            'score' => $record->score === null ? null : (float) $record->score,
            'evaluation' => $record->evaluation ? json_decode($record->evaluation, true) : null];
    }
}
