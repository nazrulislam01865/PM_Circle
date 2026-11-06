<?php

namespace App\Domain\Learning\Queries;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\LearningActivity;
use App\Models\LearningModule;
use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Small authorized projections; never serializes answer keys for unanswered questions. */
final class LearningOverview
{
    public function __construct(private readonly CurrentMemberPlan $plans) {}

    public function shell(User $user): array
    {
        $user->loadMissing('profile');
        return [
            'plan' => $this->plans->dashboardCode($user),
            'member' => ['name' => $user->name, 'role' => $user->profile?->role, 'completion' => 0],
            'isDemo' => app()->environment(['local','testing']) && config('pm-circle.demo_content_enabled'),
        ];
    }

    /** Public preview contains no member progress, answers or enrollment information. */
    public function publicPaths(): array
    {
        return LearningPath::query()->where('is_published', true)
            ->withCount('modules')->orderBy('position')->get()
            ->map(fn (LearningPath $path) => [
                'slug' => $path->slug, 'level' => $path->level, 'title' => $path->title,
                'summary' => $path->summary, 'moduleCount' => $path->modules_count,
                'practiceCount' => 0, 'completed' => 0, 'total' => 0,
                'progress' => 0, 'minutes' => 0, 'saved' => false,
                'accessTier' => $path->access_tier,
            ])->all();
    }

    /** Published practice previews only; answer keys and progress remain private. */
    public function publicPracticeModules(): array
    {
        return DB::table('learning_modules as m')
            ->join('learning_paths as p', 'm.learning_path_id', '=', 'p.id')
            ->join('learning_activities as a', function ($join) {
                $join->on('a.learning_module_id', '=', 'm.id')->where('a.type', 'mcq');
            })
            ->where('p.is_published', true)
            ->select('m.id', 'm.title', 'm.summary', 'm.minutes', 'm.position as module_position',
                'p.slug', 'p.level', 'p.title as path_title', 'p.access_tier',
                'a.position as mcq_position', 'a.minutes as mcq_minutes')
            ->orderBy('p.position')->orderBy('m.position')
            ->get()->map(fn ($row) => [
                'id' => $row->id, 'slug' => $row->slug, 'title' => $row->title,
                'summary' => $row->summary, 'pathTitle' => $row->path_title,
                'level' => $row->level, 'minutes' => (int) $row->minutes,
                'modulePosition' => (int) $row->module_position,
                'firstActivityPosition' => 1, 'mcqPosition' => (int) $row->mcq_position,
                'mcqMinutes' => (int) $row->mcq_minutes, 'mcqCompleted' => false,
                'activityCount' => 0, 'completed' => 0, 'progress' => 0,
                'accessTier' => $row->access_tier, 'saved' => false,
            ])->all();
    }

    public function paths(User $user): array
    {
        $paths = LearningPath::query()->where('is_published', true)
            ->withCount('modules')->orderBy('position')->get();
        $completed = $this->completionIds($user);
        $pathIds = $paths->pluck('id');
        $activities = DB::table('learning_activities')
            ->join('learning_modules', 'learning_activities.learning_module_id', '=', 'learning_modules.id')
            ->whereIn('learning_modules.learning_path_id', $pathIds)
            ->select('learning_activities.id', 'learning_activities.type', 'learning_activities.position as activity_position',
                'learning_activities.minutes as activity_minutes',
                'learning_modules.id as module_id', 'learning_modules.position as module_position',
                'learning_modules.title as module_title', 'learning_modules.summary as module_summary',
                'learning_modules.minutes as module_minutes', 'learning_modules.learning_path_id')
            ->orderBy('learning_modules.learning_path_id')
            ->orderBy('learning_modules.position')
            ->orderBy('learning_activities.position')
            ->get()->groupBy('learning_path_id');
        // One bounded lookup supplies saved state for every card, rather than a lookup per card.
        $savedIds = DB::table('learning_path_saves')->where('user_id', $user->id)
            ->whereIn('learning_path_id', $pathIds)->pluck('learning_path_id')->flip();
        $completedCount = $activities->flatten(1)->filter(fn ($activity) => isset($completed[$activity->id]))->count();
        $stats = ['completedActivities' => $completedCount,
            'completedPaths' => $paths->filter(fn ($path) => $activities->get($path->id, collect())->isNotEmpty() &&
                $activities->get($path->id)->every(fn ($activity) => isset($completed[$activity->id])))->count(),
            'minutes' => (int) DB::table('learning_activity_completions as c')
                ->join('learning_activities as a', 'a.id', '=', 'c.learning_activity_id')
                ->where('c.user_id', $user->id)->sum('a.minutes'),
        ];
        $cards = $paths->map(function (LearningPath $path) use ($activities, $completed, $savedIds) {
            $items = $activities->get($path->id, collect());
            $done = $items->filter(fn ($activity) => isset($completed[$activity->id]))->count();
            $total = $items->count();
            $uniqueModules = $items->unique('module_id');
            return ['slug' => $path->slug, 'level' => $path->level, 'title' => $path->title,
                'summary' => $path->summary, 'moduleCount' => $path->modules_count,
                'practiceCount' => $items->where('type', '!=', 'lesson')->count(),
                'completed' => $done, 'total' => $total,
                'progress' => $total ? (int) round(100 * $done / $total) : 0,
                'minutes' => (int) $uniqueModules->sum('module_minutes'),
                'saved' => $savedIds->has($path->id), 'accessTier' => $path->access_tier];
        })->values()->all();
        // Use the same activity rows already loaded for progress to build the catalog.
        // Each published learning module is an actual, accessible learning unit.
        $courses = $paths->flatMap(function (LearningPath $path) use ($activities, $completed, $savedIds) {
            return $activities->get($path->id, collect())->groupBy('module_id')
                ->map(function ($items) use ($path, $completed, $savedIds) {
                    $module = $items->first();
                    $done = $items->filter(fn ($activity) => isset($completed[$activity->id]))->count();
                    $mcq = $items->firstWhere('type', 'mcq');
                    $first = $items->sortBy('activity_position')->first();
                    return ['id' => $module->module_id, 'slug' => $path->slug,
                        'modulePosition' => (int) $module->module_position,
                        'firstActivityPosition' => (int) ($first?->activity_position ?? 1),
                        'mcqPosition' => $mcq ? (int) $mcq->activity_position : null,
                        'mcqMinutes' => $mcq ? (int) $mcq->activity_minutes : null,
                        'mcqCompleted' => $mcq ? isset($completed[$mcq->id]) : false,
                        'title' => $module->module_title, 'summary' => $module->module_summary,
                        'pathTitle' => $path->title, 'level' => $path->level,
                        'minutes' => (int) $module->module_minutes,
                        'activityCount' => $items->count(), 'completed' => $done,
                        'progress' => $items->count() ? (int) round(100 * $done / $items->count()) : 0,
                        'accessTier' => $path->access_tier, 'saved' => $savedIds->has($path->id)];
                })->values();
        })->values()->all();
        $recent = collect($cards)->first(fn ($card) => $card['progress'] > 0 && $card['progress'] < 100);
        return ['paths' => $cards, 'courses' => $courses, 'stats' => $stats, 'recent' => $recent];
    }

    public function path(User $user, LearningPath $path): array
    {
        $modules = $path->modules()->with('activities:id,learning_module_id,position,type,title,minutes')->get();
        $done = $this->completionIds($user);
        $saved = DB::table('learning_path_saves')->where('user_id', $user->id)->where('learning_path_id', $path->id)->exists();
        $rows = $modules->map(function (LearningModule $module) use ($done) {
            $activities = $module->activities;
            $completed = $activities->filter(fn ($a) => isset($done[$a->id]))->count();
            return ['position' => $module->position, 'title' => $module->title,
                'summary' => $module->summary, 'minutes' => $module->minutes,
                'activities' => $activities->map(fn ($a) => [
                    'position' => $a->position, 'type' => $a->type, 'title' => $a->title,
                    'minutes' => $a->minutes, 'completed' => isset($done[$a->id]),
                ])->values()->all(), 'completed' => $completed,
                'done' => $activities->isNotEmpty() && $completed === $activities->count()];
        })->values()->all();
        return ['path' => ['slug' => $path->slug, 'title' => $path->title, 'level' => $path->level,
            'summary' => $path->summary, 'introduction' => $path->introduction, 'objectives' => $path->objectives,
            'moduleCount' => $modules->count(), 'practiceCount' => $modules->sum(fn ($m) => $m->activities->where('type', '!=','lesson')->count()),
            'minutes' => $modules->sum('minutes'), 'saved' => $saved,
            'completedModules' => collect($rows)->where('done',true)->count(),
            'modules' => $rows]];
    }

    public function activity(User $user, LearningPath $path, LearningModule $module, LearningActivity $activity, int $questionPosition): array
    {
        $activity->load('questions');
        $pathData = $this->path($user, $path)['path'];
        $moduleData = collect($pathData['modules'])->firstWhere('position', $module->position);
        $complete = DB::table('learning_activity_completions')->where('user_id', $user->id)
            ->where('learning_activity_id', $activity->id)->first();
        $question = $activity->type === 'mcq' ? $activity->questions->firstWhere('position', $questionPosition) : null;
        $answers = $activity->type === 'mcq'
            ? DB::table('learning_answers')->where('user_id', $user->id)
                ->whereIn('learning_question_id', $activity->questions->pluck('id'))->get()->keyBy('learning_question_id')
            : collect();
        $prior = $question ? $answers->get($question->id) : null;
        return ['path' => ['slug' => $path->slug, 'level' => $path->level, 'moduleCount' => $pathData['moduleCount'], 'completedModules' => $pathData['completedModules']],
            'module' => ['position' => $module->position, 'title' => $module->title, 'activities' => $moduleData['activities'], 'completed' => $moduleData['completed']],
            'activity' => ['position' => $activity->position, 'type' => $activity->type, 'title' => $activity->title,
                'content' => $activity->content, 'payload' => $activity->type === 'scenario' ? ['options' => $activity->payload['options'] ?? []] : null,
                'completed' => (bool) $complete, 'response' => $complete?->written_response],
            'question' => $question ? ['position' => $question->position, 'total' => $activity->questions->count(),
                'prompt' => $question->prompt, 'choices' => $question->choices,
                'selected' => $prior?->answer_key, 'isCorrect' => $prior ? (bool) $prior->is_correct : null,
                'explanation' => $prior ? $question->explanation : null] : null,
            'answered' => $answers->count(),
        ];
    }

    private function completionIds(User $user): array
    {
        return DB::table('learning_activity_completions')
            ->where('user_id', $user->id)->pluck('learning_activity_id')
            ->mapWithKeys(fn ($id) => [$id => true])->all();
    }
}
