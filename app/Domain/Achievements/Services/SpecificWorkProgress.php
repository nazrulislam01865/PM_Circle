<?php

namespace App\Domain\Achievements\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

final class SpecificWorkProgress
{
    /** Batch only the source types needed by configured direct rewards. */
    public function completed(User $user, array $definitions, array $metrics, array $dates): array
    {
        $targets = [];
        foreach ($definitions as $badge) {
            if ($badge['mode'] === 'completion' && $badge['publishStatus'] === 'active') {
                foreach ($badge['targets'] as $target) $targets[$target] = true;
            }
        }
        $courses = $lessons = $challenges = $done = [];
        foreach (array_keys($targets) as $target) {
            $parts = explode(':', $target);
            if ($parts[0] === 'course') $courses[] = (int) $parts[1];
            if ($parts[0] === 'challenge') $challenges[] = (int) $parts[1];
            if ($parts[0] === 'lesson') $lessons[] = (int) $parts[1];
            if ($parts[0] === 'metric' && in_array($parts[1], BadgeCatalog::SUPPORTED, true)) {
                $required = $parts[1] === 'profile' ? 100 : 1;
                if (($metrics[$parts[1]] ?? 0) >= $required) $done[$target] = $dates[$parts[1]][$required] ?? null;
            }
        }
        if ($courses !== []) {
            foreach (DB::table('learning_course_completions')->where('user_id', $user->id)->whereIn('course_id', array_unique($courses))->get(['course_id', 'completed_at']) as $row) {
                $done['course:'.$row->course_id] = Carbon::parse($row->completed_at)->toIso8601String();
            }
        }
        if ($lessons !== []) {
            foreach (DB::table('learning_course_lesson_progress')->where('user_id', $user->id)->whereIn('course_id', array_unique($lessons))->whereNotNull('completed_at')->get(['course_id', 'lesson_key', 'completed_at']) as $row) {
                $key = 'lesson:'.$row->course_id.':'.$row->lesson_key;
                if (isset($targets[$key])) $done[$key] = Carbon::parse($row->completed_at)->toIso8601String();
            }
        }
        if ($challenges !== []) {
            $rows = DB::table('scenario_responses as r')->join('scenarios as s', 's.id', '=', 'r.scenario_id')
                ->where('r.user_id', $user->id)->whereNull('r.parent_id')->where('r.is_question', false)
                ->whereIn('s.status', ['published', 'closed'])->whereIn('s.id', array_unique($challenges))
                ->groupBy('s.id')->selectRaw('s.id, MIN(r.created_at) AS completed_at')->get();
            foreach ($rows as $row) $done['challenge:'.$row->id] = Carbon::parse($row->completed_at)->toIso8601String();
        }
        return $done;
    }
}
