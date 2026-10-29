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

    public function paths(User $user): array
    {
        $paths = LearningPath::query()->where('is_published', true)
            ->withCount('modules')->orderBy('position')->get();
        $completed = $this->completionIds($user);
        $pathIds = $paths->pluck('id');
        $activities = DB::table('learning_activities')
            ->join('learning_modules', 'learning_activities.learning_module_id', '=', 'learning_modules.id')
            ->whereIn('learning_modules.learning_path_id', $pathIds)
            ->select('learning_activities.id', 'learning_activities.type', 'learning_modules.learning_path_id')
            ->get()->groupBy('learning_path_id');
        $completedCount = $activities->flatten(1)->filter(fn ($activity) => isset($completed[$activity->id]))->count();
        $stats = ['completedActivities' => $completedCount,
            'completedPaths' => $paths->filter(fn ($path) => $activities->get($path->id, collect())->isNotEmpty() &&
                $activities->get($path->id)->every(fn ($activity) => isset($completed[$activity->id])))->count(),
            'minutes' => (int) DB::table('learning_activity_completions as c')
                ->join('learning_activities as a', 'a.id', '=', 'c.learning_activity_id')
                ->where('c.user_id', $user->id)->sum('a.minutes'),
        ];
        $cards = $paths->map(function (LearningPath $path) use ($activities, $completed) {
            $items = $activities->get($path->id, collect());
            $done = $items->filter(fn ($activity) => isset($completed[$activity->id]))->count();
            $total = $items->count();
            return ['slug' => $path->slug, 'level' => $path->level, 'title' => $path->title,
                'summary' => $path->summary, 'moduleCount' => $path->modules_count,
                'practiceCount' => $items->where('type', '!=', 'lesson')->count(),
                'completed' => $done, 'total' => $total,
                'progress' => $total ? (int) round(100 * $done / $total) : 0,
                'accessTier' => $path->access_tier];
        })->values()->all();
        $recent = collect($cards)->first(fn ($card) => $card['progress'] > 0 && $card['progress'] < 100);
        return ['paths' => $cards, 'stats' => $stats, 'recent' => $recent];
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
