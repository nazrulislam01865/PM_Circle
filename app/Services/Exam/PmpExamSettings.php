<?php

namespace App\Services\Exam;

use Illuminate\Support\Facades\DB;

/** Settings are fetched once per page/request; attempts snapshot the selected duration. */
final class PmpExamSettings
{
    public const DEFAULTS = [
        'enabled' => true,
        'full_question_count' => 180,
        'full_duration_minutes' => 230,
        'focused_question_count' => 15,
        'focused_duration_minutes' => 30,
        'shuffle_questions' => true,
        'needs_improvement_below' => 25,
        'target_below' => 70,
        'above_target_from' => 85,
        'sample_duration_seconds' => 90,
        'sample_question_id' => null,
        'sample_question_ids' => [],
    ];

    public function get(): array
    {
        $row = DB::table('pmp_exam_settings')->where('id', 1)->first();
        if ($row === null) {
            return self::DEFAULTS;
        }

        $ids = $row->sample_question_ids === null ? null : json_decode($row->sample_question_ids, true, 512, JSON_THROW_ON_ERROR);
        $ids = is_array($ids) ? array_values(array_map('intval', $ids)) : ($row->sample_question_id === null ? [] : [(int) $row->sample_question_id]);

        return [
            'enabled' => (bool) $row->enabled,
            'full_question_count' => (int) $row->full_question_count,
            'full_duration_minutes' => (int) $row->full_duration_minutes,
            'focused_question_count' => (int) $row->focused_question_count,
            'focused_duration_minutes' => (int) $row->focused_duration_minutes,
            'shuffle_questions' => (bool) $row->shuffle_questions,
            'needs_improvement_below' => (int) $row->needs_improvement_below,
            'target_below' => (int) $row->target_below,
            'above_target_from' => (int) $row->above_target_from,
            'sample_duration_seconds' => (int) $row->sample_duration_seconds,
            'sample_question_id' => $ids[0] ?? null,
            'sample_question_ids' => $ids,
        ];
    }

    public function update(array $data): void
    {
        // Keep the legacy single-question setting in sync for older clients.
        if (array_key_exists('sample_question_ids', $data) || array_key_exists('sample_question_id', $data)) {
            $ids = array_key_exists('sample_question_ids', $data)
                ? $data['sample_question_ids']
                : ($data['sample_question_id'] === null ? [] : [$data['sample_question_id']]);
            $ids = array_values(array_unique(array_map('intval', $ids)));
            $data['sample_question_ids'] = json_encode($ids, JSON_THROW_ON_ERROR);
            $data['sample_question_id'] = $ids[0] ?? null;
        }

        DB::table('pmp_exam_settings')->upsert([[
            'id' => 1, ...$data, 'created_at' => now(), 'updated_at' => now(),
        ]], ['id'], [...array_keys($data), 'updated_at']);
    }
}
