<?php

namespace App\Domain\DailyChallenge\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Resolves one focused, date-stable brief from currently active admin-selected choices. */
final class DailyChallengeGenerationBrief
{
    public function forDate(string $date, ?string $exactTitle = null): array
    {
        $settings = app(DailyChallengeSettings::class)->get();
        $domainValues = $this->storedValues($settings->generation_domains);
        $topicValues = $this->storedValues($settings->generation_topics);
        $choices = [
            'daily_challenge_domain' => $domainValues,
            'daily_challenge_topic' => $topicValues,
            'daily_challenge_difficulty' => array_filter([$settings->generation_difficulty]),
            'daily_challenge_approach' => array_filter([$settings->generation_approach]),
        ];
        $choices = array_filter($choices);
        $labels = [];
        if ($choices) {
            // One small indexed query resolves all active values and their current labels.
            $labels = DB::table('master_data_options')
                ->whereIn('category', array_keys($choices))
                ->whereIn('value', array_values(array_unique(array_merge(...array_values($choices)))))
                ->where('is_active', true)
                ->get(['category', 'value', 'label'])
                ->mapWithKeys(fn ($row) => [$row->category.':'.$row->value => $row->label])->all();
        }
        $domainValues = array_values(array_filter($domainValues,
            fn (string $value) => isset($labels['daily_challenge_domain:'.$value])));
        $topicValues = array_values(array_filter($topicValues,
            fn (string $value) => isset($labels['daily_challenge_topic:'.$value])));
        $dayIndex = abs((int) Carbon::createFromFormat('!Y-m-d', $date, 'Asia/Dhaka')
            ->startOfDay()->diffInDays(Carbon::create(2020, 1, 1, 0, 0, 0, 'Asia/Dhaka'), false));
        $domain = $domainValues ? $domainValues[$dayIndex % count($domainValues)] : null;
        // Walk the topic pool after one full rotation of selected domains.
        $topic = $topicValues ? $topicValues[intdiv($dayIndex, max(1, count($domainValues))) % count($topicValues)] : null;
        $label = static fn (string $group, ?string $value): ?string => $value === null || $value === ''
            ? null : ($labels[$group.':'.$value] ?? null);

        return [
            'admin_exact_title' => $exactTitle ? trim($exactTitle) : null,
            'admin_title_direction' => trim((string) ($settings->generation_title_hint ?? '')) ?: null,
            'primary_domain' => $label('daily_challenge_domain', $domain),
            'primary_topic' => $label('daily_challenge_topic', $topic),
            'difficulty' => $label('daily_challenge_difficulty', $settings->generation_difficulty),
            'approach' => $label('daily_challenge_approach', $settings->generation_approach),
            'editorial_notes' => trim((string) ($settings->generation_notes ?? '')) ?: null,
        ];
    }

    private function storedValues(mixed $json): array
    {
        $values = is_array($json) ? $json : json_decode((string) ($json ?? '[]'), true);
        return is_array($values) ? array_values(array_filter($values, 'is_string')) : [];
    }
}
