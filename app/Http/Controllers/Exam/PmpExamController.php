<?php

namespace App\Http\Controllers\Exam;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Learning\Queries\LearningOverview;
use App\Http\Controllers\Controller;
use App\Services\AI\PmpQuestionHelpService;
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

    public function entry(Request $request, CurrentMemberPlan $plans): RedirectResponse
    {
        // Resolve access only on navigation, not on every shared header render.
        return in_array($plans->code($request->user()), ['plus', 'pro'], true)
            ? to_route('exams.pmp.index')
            : to_route('pricing');
    }

    public function index(Request $request, CurrentMemberPlan $plans, LearningOverview $overview, PmpQuestionHelpService $ai): Response
    {
        $plan = $plans->details($request->user());
        abort_unless(in_array($plan['code'], ['plus', 'pro'], true), 403,
            'PMP simulator access requires an active Plus or Pro membership.');
        $userId = (int) $request->user()->id;
        $questions = DB::table('pmp_exam_questions')->where('is_active', true)->count();

        // Capped history: exactly two batch queries for attempt/response summaries.
        $recentPage = DB::table('pmp_exam_attempts')->where('user_id', $userId)
            ->orderByDesc('id')->limit(41)
            ->get(['id', 'status', 'question_ids', 'total_questions', 'correct_count',
                'started_at', 'expires_at', 'finished_at']);
        $recent = $recentPage->take(40);
        $ids = $recent->pluck('id')->all();
        $counts = empty($ids) ? collect() : DB::table('pmp_exam_attempt_answers')
            ->whereIn('attempt_id', $ids)
            ->groupBy('attempt_id')
            ->select('attempt_id')
            ->selectRaw('SUM(CASE WHEN choice IS NOT NULL THEN 1 ELSE 0 END) AS answered_count')
            ->selectRaw('SUM(CASE WHEN marked_for_review THEN 1 ELSE 0 END) AS flagged_count')
            ->get()->keyBy('attempt_id');

        // All-time totals are exact even when the 40-row history window is full.
        $examTotals = DB::table('pmp_exam_attempts')->where('user_id', $userId)
            ->selectRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed")
            ->selectRaw("SUM(CASE WHEN status = 'in_progress' AND expires_at > CURRENT_TIMESTAMP THEN 1 ELSE 0 END) AS in_progress")
            ->first();

        $completed = $recent->where('status', 'completed')->take(40);
        $completedIds = $completed->pluck('id')->all();
        $questionIds = $completed->flatMap(fn ($attempt) => json_decode($attempt->question_ids, true, 512, JSON_THROW_ON_ERROR))
            ->unique()->values()->all();
        $domains = empty($questionIds) ? collect() : DB::table('pmp_exam_questions')
            ->whereIn('id', $questionIds)->pluck('domain', 'id');
        $correctRows = empty($completedIds) ? collect() : DB::table('pmp_exam_attempt_answers as answers')
            ->join('pmp_exam_questions as questions', 'questions.id', '=', 'answers.question_id')
            ->whereIn('answers.attempt_id', $completedIds)
            ->groupBy('answers.attempt_id', 'questions.domain')
            ->selectRaw('answers.attempt_id AS attempt_id, questions.domain AS topic, SUM(CASE WHEN answers.choice = questions.correct_option THEN 1 ELSE 0 END) AS correct')
            ->get();
        $right = $correctRows->keyBy(fn ($row) => $row->attempt_id.'|'.$row->topic);
        $topics = [];
        foreach ($completed as $attempt) {
            $totals = [];
            foreach (json_decode($attempt->question_ids, true, 512, JSON_THROW_ON_ERROR) as $questionId) {
                $domain = $domains->get((int) $questionId);
                if ($domain !== null) {
                    $totals[$domain] = ($totals[$domain] ?? 0) + 1;
                }
            }
            foreach ($totals as $domain => $total) {
                $topics[] = [
                    'attemptId' => (int) $attempt->id, 'topic' => $domain,
                    'total' => $total,
                    'correct' => (int) ($right->get($attempt->id.'|'.$domain)->correct ?? 0),
                ];
            }
        }

        $ai->ensureInitialGrant($userId, $plan['code']);

        return Inertia::render('exam/Index', [
            'shell' => $overview->shell($request->user()),
            'availableQuestions' => min(self::MAX_QUESTIONS, $questions),
            'fullLength' => $questions >= self::MAX_QUESTIONS,
            'planCode' => $plan['code'],
            'planDetails' => $plan,
            'targetExamDate' => DB::table('profiles')->where('user_id', $userId)->value('pmp_target_exam_date'),
            'aiUsage' => $ai->summary($userId),
            'attemptTotals' => [
                'completed' => (int) ($examTotals->completed ?? 0),
                'inProgress' => (int) ($examTotals->in_progress ?? 0),
            ],
            'historyNextCursor' => $recentPage->count() > 40 ? (int) $recent->last()->id : null,
            'attempts' => $recent->map(function ($attempt) use ($counts) {
                $summary = $counts->get($attempt->id);
                return [
                    'id' => (int) $attempt->id, 'status' => $attempt->status,
                    'total_questions' => (int) $attempt->total_questions,
                    'correct_count' => $attempt->correct_count === null ? null : (int) $attempt->correct_count,
                    'started_at' => $attempt->started_at, 'expires_at' => $attempt->expires_at,
                    'finished_at' => $attempt->finished_at,
                    'answered_count' => (int) ($summary->answered_count ?? 0),
                    'flagged_count' => (int) ($summary->flagged_count ?? 0),
                ];
            })->all(),
            'topicAccuracy' => $topics,
        ]);
    }

    /** Cursor-paged private history; additional queries only when older records are requested. */
    public function history(Request $request, CurrentMemberPlan $plans): JsonResponse
    {
        $this->authorizeMember($request, $plans);
        $input = $request->validate(['before' => ['required', 'integer', 'min:1']]);
        $records = DB::table('pmp_exam_attempts')
            ->where('user_id', $request->user()->id)
            ->where('id', '<', (int) $input['before'])
            ->orderByDesc('id')->limit(41)
            ->get(['id', 'status', 'total_questions', 'correct_count',
                'started_at', 'expires_at', 'finished_at']);
        $visible = $records->take(40);
        $ids = $visible->pluck('id')->all();
        $counts = empty($ids) ? collect() : DB::table('pmp_exam_attempt_answers')
            ->whereIn('attempt_id', $ids)
            ->groupBy('attempt_id')->select('attempt_id')
            ->selectRaw('SUM(CASE WHEN choice IS NOT NULL THEN 1 ELSE 0 END) AS answered_count')
            ->selectRaw('SUM(CASE WHEN marked_for_review THEN 1 ELSE 0 END) AS flagged_count')
            ->get()->keyBy('attempt_id');

        return response()->json([
            'attempts' => $visible->map(function ($attempt) use ($counts): array {
                $summary = $counts->get($attempt->id);
                return [
                    'id' => (int) $attempt->id, 'status' => $attempt->status,
                    'total_questions' => (int) $attempt->total_questions,
                    'correct_count' => $attempt->correct_count === null ? null : (int) $attempt->correct_count,
                    'started_at' => $attempt->started_at, 'expires_at' => $attempt->expires_at,
                    'finished_at' => $attempt->finished_at,
                    'answered_count' => (int) ($summary->answered_count ?? 0),
                    'flagged_count' => (int) ($summary->flagged_count ?? 0),
                ];
            })->values()->all(),
            'nextCursor' => $records->count() > 40 ? (int) $visible->last()->id : null,
        ]);
    }

    public function updateTargetDate(Request $request, CurrentMemberPlan $plans): JsonResponse
    {
        $this->authorizeMember($request, $plans);
        $data = $request->validate([
            'targetDate' => ['present', 'nullable', 'date_format:Y-m-d',
                'after_or_equal:'.Carbon::now('Asia/Dhaka')->format('Y-m-d')],
        ]);
        $now = now();
        DB::table('profiles')->upsert([[
            'user_id' => $request->user()->id,
            'pmp_target_exam_date' => $data['targetDate'],
            'created_at' => $now, 'updated_at' => $now,
        ]], ['user_id'], ['pmp_target_exam_date', 'updated_at']);
        return response()->json(['targetDate' => $data['targetDate']]);
    }

    public function start(Request $request, CurrentMemberPlan $plans): JsonResponse|RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        $data = $request->validate([
            'mode' => ['sometimes', 'in:focused,full'],
            'domain' => ['required_if:mode,focused', 'nullable', 'in:People,Process,Business Environment'],
        ]);
        $focused = ($data['mode'] ?? 'full') === 'focused';
        $domain = $focused ? $data['domain'] : null;
        $userId = $request->user()->id;
        $id = DB::transaction(function () use ($userId, $focused, $domain) {
            // A new mock always gets a new immutable attempt. Existing answers and
            // resumable attempts are retained, even under concurrent start requests.
            DB::table('users')->where('id', $userId)->lockForUpdate()->first(['id']);
            $questionQuery = DB::table('pmp_exam_questions')->where('is_active', true);
            if ($focused) {
                $questionQuery->where('domain', $domain);
            }
            $ids = $questionQuery->orderBy('id')
                ->limit($focused ? 15 : self::MAX_QUESTIONS)
                ->pluck('id')->map(fn ($id) => (int) $id)->all();
            abort_if(count($ids) === 0, 409, 'No active questions are available for this practice selection.');
            $count = count($ids);
            $minutes = $count === self::MAX_QUESTIONS ? 230 : max(10, (int) ceil($count * 230 / self::MAX_QUESTIONS));
            $now = now();
            return DB::table('pmp_exam_attempts')->insertGetId([
                'user_id' => $userId, 'status' => 'in_progress', 'question_ids' => json_encode($ids, JSON_THROW_ON_ERROR),
                'total_questions' => $count, 'started_at' => $now, 'expires_at' => $now->copy()->addMinutes($minutes),
                'created_at' => $now, 'updated_at' => $now,
            ]);
        });

        if ($request->expectsJson()) {
            return response()->json(['takeUrl' => route('exams.pmp.take', ['attempt' => $id])]);
        }

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

    public function submit(Request $request, int $attempt, CurrentMemberPlan $plans): JsonResponse|RedirectResponse
    {
        $this->authorizeMember($request, $plans);
        DB::transaction(fn () => $this->finishAttempt($attempt, $request->user()->id));

        // Fetch callers need a JSON success response; browser and Inertia requests
        // keep their existing redirect behavior.
        if ($request->expectsJson()) {
            return response()->json(['resultUrl' => route('exams.pmp.result', ['attempt' => $attempt])]);
        }

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

    public function aiHelp(Request $request, int $attempt, int $question,
        CurrentMemberPlan $plans, PmpQuestionHelpService $ai): JsonResponse
    {
        $this->authorizeMember($request, $plans);
        $record = $this->ownedAttempt($attempt, $request->user()->id);
        abort_unless($record->status === 'completed', 403, 'Finish your exam before requesting AI help.');
        abort_unless(in_array($question, $this->questionIds($record), true), 404);
        $item = DB::table('pmp_exam_questions')->where('id', $question)
            ->first(['id', 'prompt', 'options', 'correct_option', 'explanation']);
        abort_unless($item, 404);
        $selected = DB::table('pmp_exam_attempt_answers')
            ->where('attempt_id', $attempt)->where('question_id', $question)->value('choice');
        try {
            return response()->json($ai->explain((int) $request->user()->id, $attempt, $question, $item, $selected));
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => 'AI question help is temporarily unavailable. Please try again.'], 503);
        }
    }

    private function authorizeMember(Request $request, CurrentMemberPlan $plans): string
    {
        $code = $plans->code($request->user());
        abort_unless(in_array($code, ['plus', 'pro'], true), 403,
            'PMP simulator access requires an active Plus or Pro membership.');
        return $code;
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
