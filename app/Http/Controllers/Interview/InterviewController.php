<?php

namespace App\Http\Controllers\Interview;

use App\Domain\Dashboard\Queries\MemberShell;
use App\Domain\Interview\QuestionCatalog;
use App\Domain\Interview\PracticeRubric;
use App\Domain\Interview\PracticeSettings;
use App\Domain\Interview\InterviewAiReview;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Support\Str;
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
        // Only the latest completed and resumable session are needed in the right rail.
        $recent = DB::table('interview_sessions as s')->where('s.user_id', $userId)
            ->whereIn('s.status', ['completed', 'in_progress'])
            ->select(['s.id', 's.industry', 's.role', 's.question_count', 's.overall_score', 's.status', 's.completed_at'])
            ->selectRaw('ROW_NUMBER() OVER (PARTITION BY s.status ORDER BY s.id DESC) as session_rank');
        $recent = DB::query()->fromSub($recent, 'recent')->where('session_rank', 1)
            ->select('recent.*')->selectSub(DB::table('interview_answers as a')->whereColumn('a.interview_session_id', 'recent.id')
                ->where('a.status', '!=', 'skipped')->where('a.answer', '!=', '')->selectRaw('COUNT(*)'), 'answered_count')->get();

        $catalog = app(QuestionCatalog::class);
        $choices = $catalog->choices();
        $settings = PracticeSettings::load();
        $settings['role_profiles'] = PracticeSettings::roleProfiles($settings, $choices['role']);
        $practiceDefaults = [];
        $preferenceKeys = ['industry', 'role', 'level', 'count', 'answerMode'];
        $preferences = $request->user()->account_preferences ?? [];
        foreach (\App\Domain\Identity\Services\AccountSettingsCatalog::pages($choices) as $page) {
            if ($page[0] !== 'Learning & practice') continue;
            foreach ($page[3] as $group) {
                foreach ($group[1] as $field) {
                    if (in_array($field['id'], $preferenceKeys, true)) {
                        $practiceDefaults[$field['id']] = \App\Domain\Identity\Services\AccountSettingsCatalog::resolve($field, (string) ($preferences[$field['id']] ?? $field['value']));
                    }
                }
            }
        }
        return Inertia::render('interview/Index', [
            'shell' => $shell->forMember($request->user()),
            'industries' => $choices['industry'], 'roles' => $choices['role'],
            'practiceDefaults' => $practiceDefaults,
            'experience' => $choices['experience'], 'types' => $choices['type'],
            'counts' => $choices['count'], 'modes' => $choices['mode'], 'questionSets' => $catalog->publishedSets(),
            'recent' => $recent->map(function ($item) { $item->answered_count = (int) $item->answered_count; return $item; }),
            'minutesPerQuestion' => $settings['minutes_per_question'], 'practiceSettings' => $settings,
        ]);
    }

    private function selectionData(StartInterviewRequest $request): array
    {
        $data = $request->validated();
        $settings = $request->practiceSettings();
        if (! $settings['allow_new_sessions']) {
            throw ValidationException::withMessages(['count' => 'New interview sessions are temporarily unavailable.']);
        }
        if (! $settings['allow_job_description'] && ! empty($data['jd'])) {
            throw ValidationException::withMessages(['jd' => 'Job description targeting is currently disabled.']);
        }
        $profile = PracticeSettings::roleProfiles($settings, [$data['role'] => $request->catalogChoices()['role'][$data['role']]])[0];
        $data['profession'] = $profile['profession'];
        if (($data['mix'] ?? null) === 'focus' && array_diff($data['focus'] ?? [], $profile['focus'])) {
            throw ValidationException::withMessages(['focus' => 'Choose focus areas available for your selected role.']);
        }
        unset($data['draft']);
        $data['count'] = (int) $data['count'];
        if (isset($data['question_set'])) $data['question_set'] = (int) $data['question_set'];
        if (($data['mix'] ?? null) === 'focus' && empty($data['focus'])) {
            throw ValidationException::withMessages(['focus' => 'Choose at least one focus area.']);
        }
        return $data;
    }

    public function preview(StartInterviewRequest $request, QuestionCatalog $catalog): JsonResponse
    {
        $data = $this->selectionData($request);
        $choices = $request->catalogChoices();
        $questions = $catalog->select($data['industry'], $data['role'], $data['experience'], $data['types'], $data['count'], $data['question_set'] ?? null, $data, $request->practiceSettings(), ['industry' => $choices['industry'][$data['industry']], 'role' => $choices['role'][$data['role']], 'types' => $choices['type']]);
        $draft = (string) Str::uuid();
        // The actual question snapshot is server-side, never accepted from the browser.
        $request->session()->put('interview_draft', ['id' => $draft, 'user' => $request->user()->id,
            'hash' => hash('sha256', json_encode($data, JSON_THROW_ON_ERROR)), 'questions' => $questions, 'expires' => now()->addMinutes(30)->timestamp]);
        return response()->json(['draft' => $draft, 'questions' => PracticeSettings::publicQuestions($questions)]);
    }

    public function jdText(Request $request, ResumeTextExtractor $extractor): JsonResponse
    {
        abort_unless(PracticeSettings::load()['allow_job_description'] && config('pm-interview.enabled'), 403);
        $request->validate(['file' => ['required', 'file', 'mimes:txt,docx,pdf', 'extensions:txt,docx,pdf', 'max:5120']]);
        $file = $request->file('file');
        try {
            $extension = strtolower($file->getClientOriginalExtension());
            $text = $extension === 'txt' ? file_get_contents($file->getRealPath()) : $extractor->extractTemplate($file->getRealPath(), $extension);
            if (! is_string($text) || ! mb_check_encoding($text, 'UTF-8') || trim($text) === '') {
                throw new \RuntimeException('No readable text.');
            }
            return response()->json(['text' => mb_substr(trim($text), 0, 12000)]);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages(['file' => 'Unable to extract readable text. Paste the relevant job description instead.']);
        }
    }

    public function start(StartInterviewRequest $request, QuestionCatalog $catalog): RedirectResponse
    {
        $data = $this->selectionData($request);
        $choices = $request->catalogChoices();
        if ($request->filled('draft')) {
            $draft = $request->session()->get('interview_draft');
            if (! $draft || $draft['id'] !== $request->validated('draft') || $draft['user'] !== $request->user()->id
                || $draft['expires'] < now()->timestamp || ! hash_equals($draft['hash'], hash('sha256', json_encode($data, JSON_THROW_ON_ERROR)))) {
                throw ValidationException::withMessages(['draft' => 'Generate your question set again before starting.']);
            }
            $questions = $draft['questions'];
        } else {
            $questions = $catalog->select($data['industry'], $data['role'], $data['experience'], $data['types'], $data['count'], $data['question_set'] ?? null, isset($data['mix']) ? $data : [], $request->practiceSettings(), ['industry' => $choices['industry'][$data['industry']], 'role' => $choices['role'][$data['role']], 'types' => $choices['type']]);
        }
        $minutes = $request->practiceSettings()['minutes_per_question'];
        $labels = ['industry' => $choices['industry'][$data['industry']], 'experience' => $choices['experience'][$data['experience']], 'role' => $choices['role'][$data['role']]];
        $id = DB::table('interview_sessions')->insertGetId(['minutes_per_question' => $minutes,
            'user_id' => $request->user()->id, 'industry' => $data['industry'],
            'role' => $data['role'], 'experience' => $data['experience'],
            'profession' => $data['profession'] ?? null, 'requested_experience' => $data['requested_experience'] ?? null,
            'target_labels' => json_encode($labels, JSON_THROW_ON_ERROR),
            'question_types' => json_encode($data['types'], JSON_THROW_ON_ERROR),
            'answer_mode' => $data['mode'],
            'questions' => json_encode($questions, JSON_THROW_ON_ERROR),
            'question_count' => $data['count'], 'created_at' => now(), 'updated_at' => now(),
        ]);
        $request->session()->forget('interview_draft');
        return to_route('interview.practice', ['session' => $id]);
    }

    public function practice(Request $request, int $session, MemberShell $shell): Response|RedirectResponse
    {
        $record = $this->owned($request, $session);
        if ($record->status === 'completed') return to_route('interview.results.show', ['session' => $session]);
        $answers = $this->answersQuery($session)->orderBy('a.position')->get();
        return Inertia::render('interview/Practice', [
            'shell' => $shell->forMember($request->user()),
            'session' => $this->sessionData($record),
            'questions' => PracticeSettings::publicQuestions(json_decode($record->questions, true, 512, JSON_THROW_ON_ERROR)),
            'answers' => $answers->map(fn ($a) => $this->answerData($a))->all(),
            'aiReview' => app(InterviewAiReview::class)->offer($request->user()),
        ]);
    }

    /** Evaluate a response locally, without AI, credits, queues or polling. */
    public function submit(SubmitAnswerRequest $request, int $session): JsonResponse
    {
        $data = $request->validated();
        $data['position'] = (int) $data['position'];
        $data['answer'] = ! empty($data['skip']) ? '' : trim($data['answer'] ?? '');
        if (empty($data['skip']) && $data['answer'] === '') {
            throw ValidationException::withMessages(['answer' => 'Enter an answer or choose Skip.']);
        }

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
            if ($prior && in_array($prior->status, ['submitted', 'pending', 'evaluated', 'skipped'], true)
                && ($prior->status === 'evaluated' || $prior->status === 'skipped')
                && trim($prior->answer) === trim($data['answer']) && $prior->mode === $data['mode']) {
                return $this->answerData($prior->ai_review_request_id ? $this->answersQuery($session)->where('a.id', $prior->id)->first() : $prior); // Exact retry: no duplicate writes.
            }

            if (! $prior) {
                $completed = DB::table('interview_answers')->where('interview_session_id', $session)
                    ->where('position', '<', $data['position'])
                    ->whereIn('status', ['submitted', 'pending', 'evaluated', 'skipped'])->count();
                if ($completed !== $data['position']) {
                    throw ValidationException::withMessages(['answer' => 'Complete previous questions before submitting this one.']);
                }
            }

            $question = json_decode($record->questions, true, 512, JSON_THROW_ON_ERROR)[$data['position']];
            $skipped = ! empty($data['skip']);
            $evaluation = $skipped ? null : PracticeRubric::evaluate($data['answer'], $question);
            $values = [
                'answer' => $data['answer'], 'mode' => $data['mode'], 'status' => $skipped ? 'skipped' : 'evaluated',
                'score' => $evaluation['score'] ?? 0, 'evaluation' => $evaluation ? json_encode($evaluation, JSON_THROW_ON_ERROR) : null, 'ai_model' => null,
                'ai_review_request_id' => null, 'input_tokens' => 0, 'output_tokens' => 0, 'evaluated_at' => $skipped ? null : now(), 'updated_at' => now(),
            ];
            if ($prior) {
                $answerId = $prior->id;
                DB::table('interview_answers')->where('id', $prior->id)->update($values);
            } else {
                $answerId = DB::table('interview_answers')->insertGetId($values + [
                    'interview_session_id' => $session, 'position' => $data['position'], 'created_at' => now(),
                ]);
            }

            return [
                'id' => $answerId, 'revision' => InterviewAiReview::revision($data['answer'], $data['mode']), 'ai_review' => null,
                'position' => $data['position'], 'answer' => trim($data['answer']),
                'mode' => $data['mode'], 'status' => $values['status'], 'score' => $values['score'], 'evaluation' => $evaluation,
            ];
        });

        return response()->json(['status' => $answer['status'], 'answer' => $answer]);
    }

    public function answerStatus(Request $request, int $session, int $position): JsonResponse
    {
        $record = $this->owned($request, $session);
        abort_unless($position >= 0 && $position < $record->question_count, 404);
        $answer = $this->answersQuery($session)->where('a.position', $position)->first();
        return response()->json(['answer' => $answer ? $this->answerData($answer) : null]);
    }

    public function retry(Request $request, int $session, int $position): JsonResponse
    {
        $record = $this->owned($request, $session);
        abort_unless($record->status === 'in_progress', 409);
        $updated = DB::table('interview_answers')->where('interview_session_id', $session)
            ->where('position', $position)->whereIn('status', ['submitted', 'pending', 'evaluated', 'failed', 'skipped'])->delete();
        abort_unless($updated, 409, 'This answer cannot be edited.');
        return response()->json(['reset' => true]);
    }

    public function finish(Request $request, int $session): JsonResponse
    {
        DB::transaction(function () use ($request, $session) {
            $record = DB::table('interview_sessions')->where('id', $session)
                ->where('user_id', $request->user()->id)->lockForUpdate()->firstOrFail();
            if ($record->status === 'completed') return;
            $summary = DB::table('interview_answers')->where('interview_session_id', $session)
                ->whereIn('status', ['submitted', 'pending', 'evaluated', 'skipped'])
                ->selectRaw('COUNT(*) as submitted, COUNT(score) as scored, COALESCE(SUM(score), 0) as total_score')->first();
            if ((int) $summary->submitted !== (int) $record->question_count) {
                throw ValidationException::withMessages(['answer' => 'Answer or skip all questions before viewing your practice summary.']);
            }
            DB::table('interview_sessions')->where('id', $session)->update([
                'status' => 'completed',
                'overall_score' => (int) $summary->scored === (int) $record->question_count ? round((float) $summary->total_score / $record->question_count, 1) : null,
                'completed_at' => now(), 'updated_at' => now(),
            ]);
        });
        return response()->json(['url' => route('interview.results.show', ['session' => $session])]);
    }

    public function results(Request $request, MemberShell $shell, ?int $session = null): Response
    {
        $query = DB::table('interview_sessions')->where('user_id', $request->user()->id)->where('status', 'completed');
        $columns = ['id', 'industry', 'role', 'profession', 'experience', 'requested_experience', 'target_labels', 'minutes_per_question', 'question_count', 'overall_score', 'completed_at', 'created_at'];
        // The archive does not fetch answer bodies. The review loads only the requested member-owned session.
        $rows = $session === null ? $query->select($columns)->selectSub(DB::table('interview_answers as a')
            ->whereColumn('a.interview_session_id', 'interview_sessions.id')->where('a.status', '!=', 'skipped')
            ->where('a.answer', '!=', '')->selectRaw('COUNT(*)'), 'answered_count')->orderByDesc('completed_at')->limit(30)->get()
            ->map(function ($item) { $item->answered_count = (int) $item->answered_count; return $item; }) : [];
        $selected = $session !== null ? $query->where('id', $session)->first([...$columns, 'questions']) : null;
        if ($session !== null) abort_unless($selected, 404);
        $answers = $selected ? $this->answersQuery($selected->id)->orderBy('a.position')->get()->map(fn ($a) => $this->answerData($a))->all() : [];
        $questions = $selected ? json_decode($selected->questions, true, 512, JSON_THROW_ON_ERROR) : [];
        if ($selected) unset($selected->questions);
        $labels = json_decode($selected->target_labels ?? 'null', true) ?? [];
        return Inertia::render('interview/Results', [
            'shell' => $shell->forMember($request->user()), 'history' => $rows,
            'selected' => $selected, 'answers' => $answers, 'aiReview' => $selected ? app(InterviewAiReview::class)->offer($request->user()) : null, 'questions' => PracticeSettings::publicQuestions($questions), 'archive' => $session === null,
            'industryLabel' => $selected ? ($labels['industry'] ?? QuestionCatalog::INDUSTRIES[$selected->industry] ?? $selected->industry) : null,
            'roleLabel' => $selected ? ($labels['role'] ?? $selected->role) : null,
            'experienceLabel' => $selected ? ($labels['experience'] ?? QuestionCatalog::EXPERIENCE[$selected->experience] ?? $selected->experience) : null,
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
        $durationSeconds = $record->question_count * (int) ($record->minutes_per_question ?? config('pm-interview.minutes_per_question', 2)) * 60;
        $deadlineAt = $startedAt->addSeconds($durationSeconds);
        $remainingSeconds = max(0, $serverNow->diffInSeconds($deadlineAt, false));

        $labels = json_decode($record->target_labels ?? 'null', true) ?? [];
        return ['id' => $record->id, 'industry' => $record->industry, 'role' => $record->role,
            'profession' => $record->profession ?? null, 'requestedExperience' => $record->requested_experience ?? null,
            'industryLabel' => $labels['industry'] ?? QuestionCatalog::INDUSTRIES[$record->industry] ?? $record->industry,
            'experienceLabel' => $labels['experience'] ?? QuestionCatalog::EXPERIENCE[$record->experience] ?? $record->experience,
            'roleLabel' => $labels['role'] ?? $record->role,
            'experience' => $record->experience, 'count' => $record->question_count,
            'mode' => $record->answer_mode, 'status' => $record->status,
            'createdAt' => $startedAt->toIso8601String(), 'serverNow' => $serverNow->toIso8601String(),
            'deadlineAt' => $deadlineAt->toIso8601String(),
            'durationSeconds' => $durationSeconds, 'remainingSeconds' => (int) ceil($remainingSeconds)];
    }

    private function answersQuery(int $session): \Illuminate\Database\Query\Builder
    {
        return DB::table('interview_answers as a')->leftJoin('ai_requests as r', 'r.id', '=', 'a.ai_review_request_id')
            ->where('a.interview_session_id', $session)->select(['a.id', 'a.position', 'a.answer', 'a.mode', 'a.status', 'a.score', 'a.evaluation', 'r.request_uuid as review_uuid', 'r.status as review_status', 'r.final_charge as review_charge']);
    }

    private function answerData(object $record): array
    {
        return ['id' => $record->id, 'revision' => InterviewAiReview::revision((string) $record->answer, (string) $record->mode),
            'ai_review' => ! empty($record->review_uuid) ? ['request_id' => $record->review_uuid, 'status' => $record->review_status, 'credits_charged' => (int) $record->review_charge] : null,
            'position' => $record->position, 'answer' => $record->answer ?? null,
            'mode' => $record->mode ?? null, 'status' => $record->status ?? 'submitted',
            'score' => ($record->score ?? null) === null ? null : (float) $record->score,
            'evaluation' => ! empty($record->evaluation) ? json_decode($record->evaluation, true) : null];
    }
}
