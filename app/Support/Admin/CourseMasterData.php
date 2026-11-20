<?php

namespace App\Support\Admin;

use App\Models\MasterDataOption;
use Illuminate\Support\Collection;

/** One source of truth for the supported course-editor dropdown choices. */
final class CourseMasterData
{
    public const GROUPS = [
        'course_category' => 'Course categories',
        'course_level' => 'Course levels',
        'course_access' => 'Course membership access',
        'course_question_kind' => 'Course question types',
        'course_question_difficulty' => 'Course question difficulty',
        'course_resource_kind' => 'Course resource types',
    ];

    /** @return array<string, array<int, array{value:string,label:string}>> */
    public static function options(array $selected = []): array
    {
        $result = MasterDataOption::query()
            ->whereIn('category', array_keys(self::GROUPS))
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['category', 'value', 'label'])
            ->groupBy('category')
            ->map(fn (Collection $rows) => $rows->map(fn (MasterDataOption $row) => [
                'value' => $row->value, 'label' => $row->label,
            ])->values()->all())->all();

        // Editing must remain possible when an administrator has archived a used option.
        foreach ($selected as $category => $value) {
            if (! array_key_exists($category, self::GROUPS) || ! is_string($value) || $value === '') {
                continue;
            }
            if (! in_array($value, array_column($result[$category] ?? [], 'value'), true)) {
                $result[$category][] = ['value' => $value, 'label' => $value.' (inactive)'];
            }
        }
        foreach (self::GROUPS as $category => $label) {
            $result[$category] ??= [];
        }
        return $result;
    }

    /** @return array<string, array<int, string>> */
    public static function values(array $selected = []): array
    {
        return array_map(static fn (array $options) => array_column($options, 'value'), self::options($selected));
    }
}
