<?php

namespace App\Services\Exam;

use Illuminate\Support\Facades\DB;

/**
 * Active question coverage for a single member. Count questions issued to an attempt,
 * not merely answers submitted; all-time coverage must not be limited to recent history.
 */
final class PmpQuestionPool
{
    /** @return list<int> */
    public function usedActiveIds(int $userId, string $plan = 'pro'): array
    {
        // PostgreSQL JSON arrays are expanded inside the database rather than loading
        // entire attempt histories and JSON payloads into PHP. DISTINCT bounds the result
        // to the active bank, even when a member has many completed attempts.
        $postgres = DB::getDriverName() === 'pgsql';
        $arraySource = $postgres
            ? 'LATERAL jsonb_array_elements_text(attempts.question_ids::jsonb) AS used(question_id)'
            : 'json_each(attempts.question_ids) AS used';
        $idMatch = $postgres ? 'questions.id = used.question_id::bigint' : 'questions.id = CAST(used.value AS INTEGER)';

        return DB::table('pmp_exam_attempts as attempts')
            ->crossJoin(DB::raw($arraySource))
            ->join('pmp_exam_questions as questions', function ($join) use ($idMatch): void {
                $join->whereRaw($idMatch)
                    ->where('questions.is_active', true);
            })
            ->where('attempts.user_id', $userId)
            ->when($plan === 'plus', fn ($q) => $q->whereIn('questions.difficulty', ['Easy', 'Moderate']))
            ->distinct()
            ->pluck('questions.id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
    }
}
