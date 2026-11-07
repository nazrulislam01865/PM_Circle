<?php

namespace App\Http\Controllers\Exam;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Learning\Queries\LearningOverview;
use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** A bounded exam workflow: questions are retrieved in one query, scoring stays server-side. */
final class PmpExamController extends Controller
{
    private const MAX_QUESTIONS = 180;

    public function index(Request $request, CurrentMemberPlan $plans, LearningOverview $overview): Response
    {
        $this->authorizeMember($request, $plans);
        $questions = DB::table('pmp_exam_questions')->where('is_active', true)->count();
        $attempts = DB::table('pmp_exam_attempts')->where('user_id', $request->user()->id)
            ->orderByDesc('id')->limit(10)
            ->get(['id', 'status', 'total_questions', 'correct_count', 'started_at', 'finished_at']);

        return Inertia::render('exam/Index', [
            'shell' => $overview->shell($request->user()),
            'availableQuestions' => min(self::MAX_QUESTIONS, $questions),
            'fullLength' => $questions >= self::MAX_QUESTIONS,
            'attempts' => $attempts,
        ]);
    }

    public function start(Request $request, CurrentMemberPlan $plans): RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        $userId = $request->user()->id;
        $id = DB::transaction(function () use ($userId) {
            // Serialize concurrent start requests for this member; re-use an unfinished attempt.
            DB::table('users')->where('id', $userId)->lockForUpdate()->first(['id']);
            $existing = DB::table('pmp_exam_attempts')->where('user_id', $userId)
                ->where('status', 'in_progress')->latest('id')->first();
            if ($existing && Carbon::parse($existing->expires_at)->isFuture()) {
                return $existing->id;
            }
            if ($existing) {
                $this->finishAttempt($existing->id, $userId);
            }
            $ids = DB::table('pmp_exam_questions')->where('is_active', true)
                ->orderBy('id')->limit(self::MAX_QUESTIONS)->pluck('id')->map(fn ($id) => (int) $id)->all();
            abort_if(count($ids) === 0, 409, 'The practice question bank has not been seeded.');
            $count = count($ids);
            $minutes = $count === self::MAX_QUESTIONS ? 230 : max(10, (int) ceil($count * 230 / self::MAX_QUESTIONS));
            $now = now();
            return DB::table('pmp_exam_attempts')->insertGetId([
                'user_id' => $userId, 'status' => 'in_progress', 'question_ids' => json_encode($ids, JSON_THROW_ON_ERROR),
                'total_questions' => $count, 'started_at' => $now, 'expires_at' => $now->copy()->addMinutes($minutes),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        });

        return to_route('exams.pmp.take', ['attempt' => $id]);
    }

    public function take(Request $request, int $attempt, CurrentMemberPlan $plans): Response|RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        $record = $this->ownedAttempt($attempt, $request->user()->id);
        if ($record->status !== 'in_progress') {
            return to_route('exams.pmp.result', ['attempt' => $attempt]);
        }
        if (Carbon::parse($record->expires_at)->isPast()) {
            DB::transaction(fn () => $this->finishAttempt($attempt, $request->user()->id));
            return to_route('exams.pmp.result', ['attempt' => $attempt]);
        }

        return Inertia::render('exam/Take', [
            'attempt' => ['id' => $record->id, 'expiresAt' => Carbon::parse($record->expires_at)->toIso8601String(),
                'total' => $record->total_questions,
                'durationSeconds' => Carbon::parse($record->expires_at)->diffInSeconds(Carbon::parse($record->started_at))],
            'questions' => $this->questions($record, false),
            'responses' => $this->responses($record->id),
        ]);
    }

    public function answer(Request $request, int $attempt, CurrentMemberPlan $plans): JsonResponse
    {
        $this->authorizeMember($request, $plans);
        $data = $request->validate([
            'questionId' => ['required', 'integer'],
            'choice' => ['present', 'nullable', Rule::in(['A', 'B', 'C', 'D'])],
            'marked' => ['required', 'boolean'],
        ]);
        return DB::transaction(function () use ($request, $attempt, $data) {
            $record = DB::table('pmp_exam_attempts')->where('id', $attempt)
                ->where('user_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($record, 404);
            if ($record->status !== 'in_progress' || Carbon::parse($record->expires_at)->isPast()) {
                if ($record->status === 'in_progress') {
                    $this->finishAttempt($attempt, $request->user()->id);
                }
                return response()->json(['message' => 'This attempt is finished.'], 409);
            }
            if (! in_array((int) $data['questionId'], $this->questionIds($record), true)) {
                return response()->json(['message' => 'Question does not belong to this attempt.'], 422);
            }
            DB::table('pmp_exam_attempt_answers')->upsert([[
                'attempt_id' => $attempt, 'question_id' => (int) $data['questionId'],
                'choice' => $data['choice'], 'marked_for_review' => (bool) $data['marked'],
                'created_at' => now(), 'updated_at' => now(),
            ]], ['attempt_id', 'question_id'], ['choice', 'marked_for_review', 'updated_at']);
            return response()->json(['saved' => true]);
        });
    }

    public function submit(Request $request, int $attempt, CurrentMemberPlan $plans): RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        DB::transaction(fn () => $this->finishAttempt($attempt, $request->user()->id));
        return to_route('exams.pmp.result', ['attempt' => $attempt]);
    }

    public function result(Request $request, int $attempt, CurrentMemberPlan $plans, LearningOverview $overview): Response|RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        $record = $this->ownedAttempt($attempt, $request->user()->id);
        if ($record->status === 'in_progress') {
            if (Carbon::parse($record->expires_at)->isFuture()) {
                return to_route('exams.pmp.take', ['attempt' => $attempt]);
            }
            DB::transaction(fn () => $this->finishAttempt($attempt, $request->user()->id));
            $record = $this->ownedAttempt($attempt, $request->user()->id);
        }
        return Inertia::render('exam/Result', [
            'shell' => $overview->shell($request->user()),
            'attempt' => ['id' => $record->id, 'total' => $record->total_questions,
                'correct' => $record->correct_count, 'answered' => DB::table('pmp_exam_attempt_answers')->where('attempt_id', $attempt)->whereNotNull('choice')->count(),
                'finishedAt' => $record->finished_at],
            'domains' => $this->domainScores($record),
        ]);
    }

    public function review(Request $request, int $attempt, CurrentMemberPlan $plans, LearningOverview $overview): Response|RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        $record = $this->ownedAttempt($attempt, $request->user()->id);
        if ($record->status === 'in_progress') {
            return to_route('exams.pmp.result', ['attempt' => $attempt]);
        }
        return Inertia::render('exam/Review', [
            'shell' => $overview->shell($request->user()),
            'attempt' => ['id' => $record->id, 'total' => $record->total_questions, 'correct' => $record->correct_count],
            'questions' => $this->questions($record, true),
            'responses' => $this->responses($record->id),
        ]);
    }

    private function authorizeMember(Request $request, CurrentMemberPlan $plans): void
    {
        abort_unless(in_array($plans->code($request->user()), ['plus', 'pro'], true), 403,
            'PMP simulator access requires an active Plus or Pro membership.');
    }

    private function ownedAttempt(int $attempt, int $userId): object
    {
        return DB::table('pmp_exam_attempts')->where('id', $attempt)->where('user_id', $userId)->firstOrFail();
    }

    private function questionIds(object $record): array
    {
        return array_map('intval', json_decode($record->question_ids, true, 512, JSON_THROW_ON_ERROR));
    }

    private function questions(object $record, bool $includeAnswers): array
    {
        $ids = $this->questionIds($record);
        $records = DB::table('pmp_exam_questions')->whereIn('id', $ids)->get()->keyBy('id');
        return collect($ids)->map(function ($id) use ($records, $includeAnswers) {
            $row = $records->get($id);
            abort_unless($row, 409, 'A question from this attempt is unavailable.');
            $question = [
                'id' => $row->id, 'domain' => $row->domain, 'difficulty' => $row->difficulty,
                'prompt' => $row->prompt, 'options' => json_decode($row->options, true, 512, JSON_THROW_ON_ERROR),
            ];
            return $includeAnswers ? [...$question, 'correct' => $row->correct_option,
                'explanation' => $row->explanation, 'otherOptions' => $row->other_options,
                'takeaway' => $row->takeaway, 'concepts' => $row->concepts,
                'references' => $row->references] : $question;
        })->all();
    }

    /** One grouped query for domain-level performance, no per-question reads. */
    private function domainScores(object $record): array
    {
        return DB::table('pmp_exam_questions as q')
            ->leftJoin('pmp_exam_attempt_answers as a', function ($join) use ($record) {
                $join->on('a.question_id', '=', 'q.id')->where('a.attempt_id', '=', $record->id);
            })
            ->whereIn('q.id', $this->questionIds($record))
            ->groupBy('q.domain')
            ->orderBy('q.domain')
            ->selectRaw('q.domain, COUNT(*) as total, SUM(CASE WHEN a.choice IS NOT NULL AND a.choice = q.correct_option THEN 1 ELSE 0 END) as correct')
            ->get()->map(fn ($row) => [
                'domain' => $row->domain, 'total' => (int) $row->total, 'correct' => (int) $row->correct,
            ])->all();
    }

    private function responses(int $attempt): array
    {
        return DB::table('pmp_exam_attempt_answers')->where('attempt_id', $attempt)
            ->get(['question_id', 'choice', 'marked_for_review'])
            ->mapWithKeys(fn ($row) => [$row->question_id => [
                'choice' => $row->choice, 'marked' => (bool) $row->marked_for_review,
            ]])->all();
    }

    /** Idempotent and serialized: the answer key is never sent to an active attempt. */
    private function finishAttempt(int $attempt, int $userId): void
    {
        $record = DB::table('pmp_exam_attempts')->where('id', $attempt)
            ->where('user_id', $userId)->lockForUpdate()->first();
        abort_unless($record, 404);
        if ($record->status !== 'in_progress') {
            return;
        }
        $ids = $this->questionIds($record);
        $keys = DB::table('pmp_exam_questions')->whereIn('id', $ids)->pluck('correct_option', 'id');
        $choices = DB::table('pmp_exam_attempt_answers')->where('attempt_id', $attempt)->pluck('choice', 'question_id');
        $correct = collect($ids)->filter(fn ($id) => $choices->get($id) !== null
            && $choices->get($id) === $keys->get($id))->count();
        DB::table('pmp_exam_attempts')->where('id', $attempt)->update([
            'status' => 'completed', 'correct_count' => $correct,
            'finished_at' => now(), 'updated_at' => now(),
        ]);
    }
}
