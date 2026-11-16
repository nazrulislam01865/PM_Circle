<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportPmpExamQuestionsRequest;
use App\Http\Requests\Admin\SavePmpExamQuestionRequest;
use App\Http\Requests\Admin\UpdatePmpExamSettingsRequest;
use App\Services\Exam\PmpExamSettings;
use App\Services\Exam\PmpQuestionImporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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
        $questions = $query->orderByDesc('id')->paginate(20)->withQueryString();
        $questions->through(fn ($q) => [
            'id' => (int) $q->id,
            'code' => $q->code, 'domain' => $q->domain, 'difficulty' => $q->difficulty,
            'prompt' => $q->prompt, 'options' => json_decode($q->options, true, 512, JSON_THROW_ON_ERROR),
            'correct_option' => $q->correct_option, 'explanation' => $q->explanation,
            'other_options' => $q->other_options, 'takeaway' => $q->takeaway,
            'concepts' => $q->concepts, 'references' => $q->references,
            'is_active' => (bool) $q->is_active,
        ]);
        $stats = DB::table('pmp_exam_questions')->selectRaw('COUNT(*) AS total')
            ->selectRaw('SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active')->first();

        return Inertia::render('admin/PmpQuestionBank', [
            'settings' => $settings->get(),
            'stats' => ['total' => (int) ($stats->total ?? 0), 'active' => (int) ($stats->active ?? 0)],
            'questions' => $questions,
            'filters' => ['search' => $filters['search'] ?? '', 'domain' => $filters['domain'] ?? '', 'status' => $filters['status'] ?? 'all'],
        ]);
    }

    public function updateSettings(UpdatePmpExamSettingsRequest $request, PmpExamSettings $settings): RedirectResponse
    {
        $settings->update($request->validated());
        return back()->with('status', 'PMP exam settings saved. Ongoing attempts keep their original deadline and questions.');
    }

    public function store(SavePmpExamQuestionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['options'] = json_encode($data['options'], JSON_THROW_ON_ERROR);
        $data['explanation'] ??= '';
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
            $data['options'] = json_encode($data['options'], JSON_THROW_ON_ERROR);
            $data['explanation'] ??= '';
            DB::table('pmp_exam_questions')->where('id', $question)->update([...$data, 'updated_at' => now()]);
        });
        return back()->with('status', 'Question updated.');
    }

    public function toggle(Request $request, int $question): RedirectResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $affected = DB::table('pmp_exam_questions')->where('id', $question)
            ->update(['is_active' => $data['is_active'], 'updated_at' => now()]);
        abort_unless($affected, 404);
        return back()->with('status', $data['is_active'] ? 'Question activated.' : 'Question deactivated. Existing attempts are preserved.');
    }

    public function import(ImportPmpExamQuestionsRequest $request, PmpQuestionImporter $importer): RedirectResponse
    {
        $imported = $importer->import($request->file('file'));
        return back()->with('status', "{$imported} PMP questions imported successfully.");
    }

    public function template(): BinaryFileResponse
    {
        return response()->download(
            resource_path('templates/pmp-question-import.xlsx'),
            'pm-circle-pmp-question-template.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }
}
