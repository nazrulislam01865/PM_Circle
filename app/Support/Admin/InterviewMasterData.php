<?php

namespace App\Support\Admin;

use Illuminate\Support\Facades\DB;

/** Interview option groups share the site's Master Data table and dropdown controls. */
final class InterviewMasterData
{
    public const GROUPS = [
        'interview_industry' => 'Interview industries',
        'interview_role' => 'Interview PM roles',
        'interview_experience' => 'Interview experience levels',
        'interview_type' => 'Interview question types',
        'interview_count' => 'Interview question counts',
        'interview_mode' => 'Interview answer modes',
    ];

    public static function category(string $group): string
    {
        return 'interview_'.$group;
    }

    /** Return all six groups in one query, with stable option keys. */
    public static function options(bool $includeInactive = false): array
    {
        $query = DB::table('master_data_options')->whereIn('category', array_keys(self::GROUPS));
        if (! $includeInactive) {
            $query->where('is_active', true);
        }
        return $query->orderBy('category')->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'category', 'value', 'label', 'sort_order', 'is_active'])
            ->map(static fn ($row): array => [
                'id' => $row->id, 'group' => substr($row->category, strlen('interview_')),
                'key' => $row->value, 'label' => $row->label,
                'sort_order' => $row->sort_order, 'is_active' => (bool) $row->is_active,
            ])->all();
    }

    public static function isAllowedValue(string $category, string $value): bool
    {
        if (! isset(self::GROUPS[$category]) || $value !== trim($value)) {
            return false;
        }
        $group = substr($category, strlen('interview_'));
        $limit = ['industry' => 40, 'role' => 70, 'experience' => 30, 'type' => 100, 'mode' => 12, 'count' => 3][$group];
        if (mb_strlen($value) > $limit) {
            return false;
        }
        if ($group === 'count') {
            return ctype_digit($value) && (int) $value >= 1 && (int) $value <= 50 && (string) (int) $value === $value;
        }
        if ($group === 'mode') {
            return in_array($value, ['type', 'speak', 'both'], true);
        }
        return preg_match('/^[a-zA-Z0-9][a-zA-Z0-9 _&+.-]*$/D', $value) === 1;
    }
}
