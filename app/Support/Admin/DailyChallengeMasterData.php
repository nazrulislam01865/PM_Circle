<?php

namespace App\Support\Admin;

use Illuminate\Support\Facades\DB;

/** Curated Daily Challenge choices shared by Master Data and the editorial settings form. */
final class DailyChallengeMasterData
{
    public const GROUPS = [
        'daily_challenge_domain' => 'Daily Challenge domains',
        'daily_challenge_topic' => 'Daily Challenge topics',
        'daily_challenge_difficulty' => 'Daily Challenge difficulty',
        'daily_challenge_approach' => 'Daily Challenge approaches',
    ];

    public static function options(): array
    {
        $result = DB::table('master_data_options')
            ->whereIn('category', array_keys(self::GROUPS))
            ->where('is_active', true)
            ->orderBy('sort_order')->orderBy('id')
            ->get(['category', 'value', 'label'])
            ->groupBy('category')
            ->map(fn ($rows) => $rows->map(fn ($row) => [
                'value' => $row->value, 'label' => $row->label,
            ])->values()->all())->all();

        foreach (self::GROUPS as $category => $label) {
            $result[$category] ??= [];
        }

        return $result;
    }

    public static function isAllowedValue(string $category, string $value): bool
    {
        return isset(self::GROUPS[$category])
            && mb_strlen($value) <= ($category === 'daily_challenge_difficulty' ? 32 : 80)
            && preg_match('/^[\p{L}\p{N} .,&()\/-]{1,80}$/uD', $value) === 1;
    }
}
