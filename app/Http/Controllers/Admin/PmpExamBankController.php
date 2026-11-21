<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportPmpExamQuestionsRequest;
use App\Http\Requests\Admin\SavePmpExamQuestionRequest;
use App\Http\Requests\Admin\UpdatePmpExamSettingsRequest;
use App\Services\Exam\PmpExamSettings;
use App\Services\Exam\PmpQuestionImporter;
use App\Services\Exam\PmpQuestionContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Administrator-only question bank, import and exam runtime rules. */
final class PmpExamBankController extends Controller
{
    public function index(Request $request, PmpExamSettings $settings): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'domain' => ['nullable', Rule::in(['People', 'Process', 'Business Environment'])],
            'status' => ['nullable', Rule::in(['all', 'active', 'inactive'])],
            'review_status' => ['nullable', Rule::in(PmpQuestionContent::REVIEW_STATUSES)],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = DB::table('pmp_exam_questions');
        if (($filters['search'] ?? '') !== '') {
            $term = '%'.strtolower($filters['search']).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(code) LIKE ?', [$term])
                ->orWhereRaw('LOWER(prompt) LIKE ?', [$term]));
        }
        if (! empty($filters['domain'])) {
            $query->where('domain', $filters['domain']);
        }
        if (($filters['status'] ?? 'all') !== 'all') {
            $query->where('is_active', $filters['status'] === 'active');
        }
        if (! empty($filters['review_status'])) {
            $query->where('review_status', $filters['review_status']);
        }
        $questions = $query->orderByDesc('id')->paginate(20)->withQueryString();
        $questions->through(fn ($q) => [
            'id' => (int) $q->id,
            'code' => $q->code, 'domain' => $q->domain, 'difficulty' => $q->difficulty,
            'prompt' => $q->prompt, 'options' => json_decode($q->options, true, 512, JSON_THROW_ON_ERROR),
            'correct_option' => $q->correct_option, 'correct_answer_text' => $q->correct_answer_text, 'explanation' => $q->explanation,
            'other_options' => $q->other_options, 'takeaway' => $q->takeaway,
            'concepts' => $q->concepts, 'references' => $q->references,
            'eco_task_id' => $q->eco_task_id, 'eco_task_focus' => $q->eco_task_focus,
            'approach' => $q->approach,
            'option_rationales' => $q->option_rationales ? json_decode($q->option_rationales, true, 512, JSON_THROW_ON_ERROR) : null,
            'pmbok_performance_domain' => $q->pmbok_performance_domain,
            'legacy_knowledge_area' => $q->legacy_knowledge_area, 'industry' => $q->industry,
            'question_type' => $q->question_type, 'reference_publication' => $q->reference_publication,
            'reference_section' => $q->reference_section, 'reference_heading' => $q->reference_heading,
            'reference_pdf_page' => $q->reference_pdf_page, 'eco_reference' => $q->eco_reference,
            'review_status' => $q->review_status,
            'is_active' => (bool) $q->is_active,
        ]);
        $stats = DB::table('pmp_exam_questions')->selectRaw('COUNT(*) AS total')
            ->selectRaw('SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active')
            ->selectRaw("SUM(CASE WHEN review_status = 'Approved' AND NOT is_active THEN 1 ELSE 0 END) AS ready")
            ->first();

        $currentSettings = $settings->get();
        $sampleIds = $currentSettings['sample_question_ids'];
        $sampleRows = empty($sampleIds) ? collect()
            : DB::table('pmp_exam_questions')->whereIn('id', $sampleIds)
                ->get(['id', 'code', 'domain', 'prompt', 'is_active'])->keyBy('id');
        $selectedSamples = collect($sampleIds)->map(function ($id) use ($sampleRows) {
            $item = $sampleRows->get($id);
            return $item ? [
                'id' => (int) $item->id,
                'code' => $item->code,
                'domain' => $item->domain,
                'prompt' => Str::limit($item->prompt, 160),
                'is_active' => (bool) $item->is_active,
            ] : null;
        })->filter()->values()->all();

        return Inertia::render('admin/PmpQuestionBank', [
            'settings' => $currentSettings,
            'selectedSampleQuestions' => $selectedSamples,
            'selectedSampleQuestion' => $selectedSamples[0] ?? null,
            'stats' => ['total' => (int) ($stats->total ?? 0), 'active' => (int) ($stats->active ?? 0),
                'ready' => (int) ($stats->ready ?? 0)],
            'questions' => $questions,
            'filters' => ['search' => $filters['search'] ?? '', 'domain' => $filters['domain'] ?? '', 'status' => $filters['status'] ?? 'all',
                'review_status' => $filters['review_status'] ?? ''],
        ]);
    }

    /** Search public-sample candidates without loading the entire question bank into the editor. */
    public function sampleOptions(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'domain' => ['nullable', Rule::in(['People', 'Process', 'Business Environment'])],
        ]);
        $search = trim($validated['search'] ?? '');
        $query = DB::table('pmp_exam_questions')->where('is_active', true);
        if (! empty($validated['domain'])) {
            $query->where('domain', $validated['domain']);
        }
        if ($search !== '') {
            $term = '%'.strtolower(addcslashes($search, '%_\\')).'%';
            $query->where(function ($q) use ($term, $search): void {
                $q->whereRaw("LOWER(code) LIKE ? ESCAPE '\\'", [$term])
                    ->orWhereRaw("LOWER(prompt) LIKE ? ESCAPE '\\'", [$term]);
                if (ctype_digit($search)) {
                    $q->orWhere('id', (int) $search);
                }
            });
        }

        return response()->json(['questions' => $query->orderByDesc('id')->limit(20)
            ->get(['id', 'code', 'domain', 'prompt'])->map(fn ($row) => [
                'id' => (int) $row->id,
                'code' => $row->code,
                'domain' => $row->domain,
                'prompt' => Str::limit($row->prompt, 160),
                'is_active' => true,
            ])->all()]);
    }

    public function updateSettings(UpdatePmpExamSettingsRequest $request, PmpExamSettings $settings): RedirectResponse
    {
        $settings->update($request->validated());
        return back()->with('status', 'PMP exam settings saved. Ongoing attempts keep their original deadline and questions.');
    }

    public function store(SavePmpExamQuestionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data = PmpQuestionContent::forDatabase($data);
        if ($data['is_active'] && $data['review_status'] !== 'Approved') {
            throw ValidationException::withMessages(['review_status' => 'Only approved questions can be activated.']);
        }
        try {
            DB::table('pmp_exam_questions')->insert([
                ...$data, 'created_at' => now(), 'updated_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $exception) {
            if (in_array((string) $exception->getCode(), ['23000', '23505'], true)) {
                throw ValidationException::withMessages(['code' => 'That question code is already in use.']);
            }
            throw $exception;
        }
        return back()->with('status', 'Question added to the PMP question bank.');
    }

    public function update(SavePmpExamQuestionRequest $request, int $question): RedirectResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($question, $data): void {
            $existing = DB::table('pmp_exam_questions')->where('id', $question)->lockForUpdate()->first();
            abort_unless($existing, 404);
            // Existing test results must not be rescored using an edited answer key.
            if (DB::table('pmp_exam_attempts')->whereJsonContains('question_ids', $question)->exists()) {
                throw ValidationException::withMessages(['question' => 'This question is used by an attempt. Deactivate it and create a new question code instead of changing its content or answer.']);
            }
            $prepared = PmpQuestionContent::forDatabase($data, $existing->review_status);
            if ($prepared['is_active'] && $prepared['review_status'] !== 'Approved') {
                throw ValidationException::withMessages(['review_status' => 'Only approved questions can be activated.']);
            }
            DB::table('pmp_exam_questions')->where('id', $question)->update([...$prepared, 'updated_at' => now()]);
        });
        return back()->with('status', 'Question updated.');
    }

    public function toggle(Request $request, int $question): RedirectResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        DB::transaction(function () use ($question, $data): void {
            $record = DB::table('pmp_exam_questions')->where('id', $question)->lockForUpdate()->first(['id', 'review_status']);
            abort_unless($record, 404);
            if ($data['is_active'] && $record->review_status !== 'Approved') {
                throw ValidationException::withMessages(['review_status' => 'Approve the question before activating it.']);
            }
            DB::table('pmp_exam_questions')->where('id', $question)->update([
                'is_active' => $data['is_active'], 'updated_at' => now(),
            ]);
        });
        return back()->with('status', $data['is_active'] ? 'Question activated.' : 'Question deactivated. Existing attempts are preserved.');
    }

    /** Publish only questions that have already passed review; never publish drafts. */
    public function activateApproved(): RedirectResponse
    {
        $count = DB::table('pmp_exam_questions')
            ->where('review_status', 'Approved')->where('is_active', false)
            ->update(['is_active' => true, 'updated_at' => now()]);

        return back()->with('status', "{$count} approved questions activated for the PMP exam simulator.");
    }

    public function import(ImportPmpExamQuestionsRequest $request, PmpQuestionImporter $importer): RedirectResponse
    {
        $activateAll = $request->boolean('activate_all');
        $imported = $importer->import($request->file('file'), $activateAll);
        $suffix = $activateAll ? ' All imported questions are approved and active.' : '';

        return back()->with('status', "{$imported} PMP questions imported successfully.{$suffix}");
    }

    public function template(): BinaryFileResponse
    {
        return response()->download(
            resource_path('templates/pmp-question-import.xlsx'),
            'PM_Circle_PMP_Question_Bank.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }
}
