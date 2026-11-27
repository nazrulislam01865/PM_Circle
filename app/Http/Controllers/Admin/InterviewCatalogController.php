<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Domain\Interview\PracticeSettings;
use App\Http\Requests\Admin\ImportInterviewQuestionsRequest;
use App\Services\Interview\InterviewQuestionImporter;
use App\Support\Admin\InterviewMasterData;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Http\Requests\Admin\SaveInterviewOptionRequest;
use App\Http\Requests\Admin\SaveInterviewQuestionRequest;
use App\Http\Requests\Admin\SaveInterviewSetRequest;
use App\Http\Requests\Admin\UpdateInterviewSettingsRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class InterviewCatalogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $setId = (int) $request->integer('set', 0);
        $questions = DB::table('interview_questions as q')
            ->join('interview_question_sets as s', 's.id', '=', 'q.set_id')
            ->when($search !== '', fn ($query) => $query->whereRaw('LOWER(q.text) LIKE ?', ['%'.strtolower(addcslashes($search, '%_\\')).'%']))
            ->when($setId > 0, fn ($query) => $query->where('q.set_id', $setId))
            ->orderBy('s.sort_order')->orderBy('q.sort_order')->orderBy('q.id')
            ->select(['q.id', 'q.set_id', 'q.type', 'q.text', 'q.is_active', 'q.sort_order', 'q.topic', 'q.difficulty', 'q.answer_guidance', 's.title as set_title'])
            ->paginate(15)->withQueryString();
        $sets = DB::table('interview_question_sets as s')
            ->leftJoin('interview_questions as q', 'q.set_id', '=', 's.id')
            ->select('s.id', 's.title', 's.description', 's.industry', 's.role', 's.experience', 's.is_active', 's.sort_order')
            ->selectRaw('COUNT(q.id) as question_count')
            ->groupBy('s.id')->orderBy('s.sort_order')->orderBy('s.id')->get();
        $options = InterviewMasterData::options(includeInactive: true);
        $settings = PracticeSettings::load();
        $roles = array_column(array_filter($options, fn ($option) => $option['group'] === 'role'), 'label', 'key');
        $settings['role_profiles'] = PracticeSettings::roleProfiles($settings, $roles);
        return Inertia::render('admin/InterviewCatalog', [
            'options' => $options,
            'sets' => $sets, 'questions' => $questions,
            'settings' => $settings,
            'filters' => ['search' => $search, 'set' => $setId],
        ]);
    }

    public function createOption(SaveInterviewOptionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $exists = DB::table('master_data_options')->where('category', InterviewMasterData::category($data['group']))->where('value', $data['key'])->exists();
        if ($exists) throw ValidationException::withMessages(['key' => 'This option already exists. Edit the existing option instead.']);
        DB::table('master_data_options')->insert(['category' => InterviewMasterData::category($data['group']), 'value' => $data['key'], 'label' => $data['label'], 'is_active' => $data['is_active'], 'sort_order' => $data['sort_order'], 'created_at' => now(), 'updated_at' => now()]);
        return back()->with('status', 'Interview option added.');
    }

    public function updateOption(SaveInterviewOptionRequest $request, int $option): RedirectResponse
    {
        $data = $request->safe()->only(['label', 'is_active', 'sort_order']);
        DB::transaction(function () use ($data, $option) {
            $record = DB::table('master_data_options')->whereIn('category', array_keys(InterviewMasterData::GROUPS))->where('id', $option)->first();
            abort_unless($record, 404);
            // Lock the entire option group so simultaneous admin updates cannot disable its last choice.
            $group = DB::table('master_data_options')->where('category', $record->category)
                ->orderBy('id')->lockForUpdate()->get(['id', 'is_active']);
            if (! $data['is_active'] && ! $group->contains(fn ($row) => $row->id !== $option && $row->is_active)) {
                throw ValidationException::withMessages(['is_active' => 'Keep at least one enabled option in each group.']);
            }
            DB::table('master_data_options')->where('id', $option)->update($data + ['updated_at' => now()]);
        });
        return back()->with('status', 'Interview option updated.');
    }

    public function createSet(SaveInterviewSetRequest $request): RedirectResponse
    {
        DB::table('interview_question_sets')->insert($request->validated() + ['created_at' => now(), 'updated_at' => now()]);
        return back()->with('status', 'Interview question set created.');
    }

    public function updateSet(SaveInterviewSetRequest $request, int $set): RedirectResponse
    {
        $updated = DB::table('interview_question_sets')->where('id', $set)->update($request->validated() + ['updated_at' => now()]);
        abort_unless($updated, 404);
        return back()->with('status', 'Interview question set updated.');
    }

    public function createQuestion(SaveInterviewQuestionRequest $request): RedirectResponse
    {
        DB::table('interview_questions')->insert($request->validated() + ['created_at' => now(), 'updated_at' => now()]);
        return back()->with('status', 'Interview question added.');
    }

    public function updateQuestion(SaveInterviewQuestionRequest $request, int $question): RedirectResponse
    {
        $updated = DB::table('interview_questions')->where('id', $question)->update($request->validated() + ['updated_at' => now()]);
        abort_unless($updated, 404);
        return back()->with('status', 'Interview question updated.');
    }

    public function deleteOption(int $option): RedirectResponse
    {
        DB::transaction(function () use ($option): void {
            $row = DB::table('master_data_options')->whereIn('category', array_keys(InterviewMasterData::GROUPS))
                ->where('id', $option)->lockForUpdate()->first();
            abort_unless($row, 404);
            $group = substr($row->category, strlen('interview_'));
            // Keep an available choice and protect values referenced by active question sets/questions.
            $remaining = DB::table('master_data_options')->where('category', $row->category)->where('id', '!=', $option)
                ->where('is_active', true)->exists();
            if (! $remaining) {
                throw ValidationException::withMessages(['delete' => 'At least one active option must remain in this group.']);
            }
            if (in_array($group, ['industry', 'role', 'experience'], true)
                && DB::table('interview_question_sets')->where($group, $row->value)->exists()) {
                throw ValidationException::withMessages(['delete' => 'This option is used by question sets. Change those sets before deleting it.']);
            }
            if ($group === 'type' && DB::table('interview_questions')->where('type', $row->value)->exists()) {
                throw ValidationException::withMessages(['delete' => 'This question type is used by questions. Reassign them before deleting it.']);
            }
            DB::table('master_data_options')->where('id', $option)->delete();
        });
        return back()->with('status', 'Interview option deleted. Existing session snapshots are preserved.');
    }

    public function deleteSet(int $set): RedirectResponse
    {
        DB::transaction(function () use ($set): void {
            $row = DB::table('interview_question_sets')->where('id', $set)->lockForUpdate()->first();
            abort_unless($row, 404);
            if (DB::table('interview_questions')->where('set_id', $set)->exists()) {
                throw ValidationException::withMessages(['delete' => 'This set contains questions. Move or delete those questions first.']);
            }
            DB::table('interview_question_sets')->where('id', $set)->delete();
        });
        return back()->with('status', 'Empty interview question set deleted.');
    }

    public function deleteQuestion(int $question): RedirectResponse
    {
        $deleted = DB::table('interview_questions')->where('id', $question)->delete();
        abort_unless($deleted, 404);
        return back()->with('status', 'Interview question deleted. Existing sessions are unchanged.');
    }

    public function import(ImportInterviewQuestionsRequest $request, InterviewQuestionImporter $importer): RedirectResponse
    {
        $count = $importer->import((int) $request->validated('set_id'), $request->file('file'));
        return back()->with('status', "{$count} interview questions imported into the selected set.");
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(static function (): void {
            $handle = fopen('php://output', 'wb');
            fputcsv($handle, InterviewQuestionImporter::HEADERS, ',', '"', '');
            fputcsv($handle, ['General', 'How do you manage competing project priorities?', 'Yes', '10'], ',', '"', '');
            fclose($handle);
        }, 'PM_Circle_Interview_Questions_Template.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function updateSettings(UpdateInterviewSettingsRequest $request): RedirectResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($data): void {
            $row = DB::table('interview_configuration')->where('id', 1)->lockForUpdate()->firstOrFail();
            $settings = array_replace(PracticeSettings::defaults(), json_decode($row->practice_settings ?? 'null', true) ?? [], collect($data)->except('minutes_per_question')->all());
            if ($settings['focus_percent'] + $settings['focus_common_percent'] > 100) {
                throw ValidationException::withMessages(['focus_common_percent' => 'Focus and common percentages must total 100% or less.']);
            }
            if (isset($data['role_profiles'])) {
                $keys = array_column($data['role_profiles'], 'role');
                $valid = DB::table('master_data_options')->where('category', 'interview_role')->whereIn('value', $keys)->pluck('value')->all();
                if (array_diff($keys, $valid)) throw ValidationException::withMessages(['role_profiles' => 'A role was removed. Reload the page before saving.']);
                foreach ($settings['role_profiles'] as &$profile) $profile['focus'] = array_values(array_unique($profile['focus']));
                unset($profile);
            }
            DB::table('interview_configuration')->where('id', 1)->update([
                'minutes_per_question' => $data['minutes_per_question'], 'practice_settings' => json_encode($settings, JSON_THROW_ON_ERROR), 'updated_at' => now(),
            ]);
        });
        return back()->with('status', 'Interview settings updated for new sessions.');
    }
}
