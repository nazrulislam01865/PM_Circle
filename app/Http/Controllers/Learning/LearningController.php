<?php

namespace App\Http\Controllers\Learning;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Learning\Actions\RecordLearningProgress;
use App\Domain\Learning\Queries\LearningOverview;
use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\CheckAnswerRequest;
use App\Http\Requests\Learning\CompleteActivityRequest;
use App\Models\LearningPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class LearningController extends Controller
{
    public function index(Request $request, LearningOverview $overview): Response
    {
        return Inertia::render('learning/Catalog', [
            'shell' => $overview->shell($request->user()),
            ...$overview->paths($request->user()),
        ]);
    }

    public function show(Request $request, string $path, LearningOverview $overview, CurrentMemberPlan $plans): Response
    {
        $record = $this->path($path, $request, $plans);
        return Inertia::render('learning/PathShow', [
            'shell' => $overview->shell($request->user()),
            ...$overview->path($request->user(), $record),
        ]);
    }

    public function activity(Request $request, string $path, int $module, int $activity, LearningOverview $overview, CurrentMemberPlan $plans): Response
    {
        [$p, $m, $a] = $this->records($path, $module, $activity, $request, $plans);
        $query = $request->validate(['question' => ['nullable','integer','between:1,3']]);
        $position = (int) ($query['question'] ?? 1);
        $data = $overview->activity($request->user(), $p, $m, $a, $position);
        abort_if($a->type === 'mcq' && ! $data['question'], 404);
        return Inertia::render('learning/Activity', ['shell' => $overview->shell($request->user()), ...$data]);
    }

    public function check(CheckAnswerRequest $request, string $path, int $module, int $activity, RecordLearningProgress $recorder, CurrentMemberPlan $plans): RedirectResponse
    {
        [, , $record] = $this->records($path, $module, $activity, $request, $plans);
        abort_unless($record->type === 'mcq', 404);
        $query = $request->validate(['question' => ['required','integer','min:1','max:100']]);
        $question = $record->questions()->where('position', $query['question'])->firstOrFail();
        $recorder->answer($request->user(), $question, $request->validated('choice'));
        return back();
    }

    public function complete(CompleteActivityRequest $request, string $path, int $module, int $activity, RecordLearningProgress $recorder, CurrentMemberPlan $plans): RedirectResponse
    {
        [, , $record] = $this->records($path, $module, $activity, $request, $plans);
        abort_unless(in_array($record->type, ['lesson','short_answer','scenario'], true), 404);
        $response = $request->validated('response');
        if ($record->type !== 'lesson' && blank($response)) {
            throw ValidationException::withMessages(['response' => 'Please provide your response before continuing.']);
        }
        if ($record->type === 'short_answer' && mb_strlen(trim((string) $response)) < 20) {
            throw ValidationException::withMessages(['response' => 'Please write at least 20 characters.']);
        }
        if ($record->type === 'scenario' && ! in_array($response, ['0','1','2'], true)) {
            throw ValidationException::withMessages(['response' => 'Choose an available option.']);
        }
        $recorder->complete($request->user(), $record, $response);
        return back();
    }

    public function save(Request $request, string $path, CurrentMemberPlan $plans): RedirectResponse
    {
        $record = $this->path($path, $request, $plans);
        DB::table('learning_path_saves')->insertOrIgnore([
            'user_id' => $request->user()->id, 'learning_path_id' => $record->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return back();
    }

    public function unsave(Request $request, string $path, CurrentMemberPlan $plans): RedirectResponse
    {
        $record = $this->path($path, $request, $plans);
        DB::table('learning_path_saves')->where('user_id', $request->user()->id)->where('learning_path_id', $record->id)->delete();
        return back();
    }

    private function path(string $slug, Request $request, CurrentMemberPlan $plans): LearningPath
    {
        $path = LearningPath::query()->where('slug', $slug)->where('is_published', true)->firstOrFail();
        $tier = $plans->code($request->user());
        abort_unless($path->access_tier === 'free' || $tier === 'pro' || ($path->access_tier === 'plus' && $tier === 'plus'), 403);
        return $path;
    }

    private function records(string $slug, int $module, int $activity, Request $request, CurrentMemberPlan $plans): array
    {
        $path = $this->path($slug, $request, $plans);
        $moduleRecord = $path->modules()->where('position', $module)->firstOrFail();
        $activityRecord = $moduleRecord->activities()->where('position', $activity)->firstOrFail();
        return [$path, $moduleRecord, $activityRecord];
    }
}
