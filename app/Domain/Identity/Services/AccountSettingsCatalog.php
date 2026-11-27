<?php

namespace App\Domain\Identity\Services;

use App\Domain\Interview\QuestionCatalog;

final class AccountSettingsCatalog
{
    private const INTERVIEW_KEYS = ['industry' => 'industry', 'role' => 'role', 'level' => 'experience', 'count' => 'count', 'answerMode' => 'mode'];

    public static function pages(?array $catalog = null): array
    {
        $pages = config('account_settings');
        $catalog ??= app(QuestionCatalog::class)->choices();
        foreach ($pages as &$page) {
            foreach ($page[3] as &$group) {
                foreach ($group[1] as &$field) {
                    $key = self::INTERVIEW_KEYS[$field['id']] ?? null;
                    if ($key === null) continue;
                    $options = $catalog[$key];
                    $field['choices'] = array_map('strval', array_keys($options));
                    $field['options'] = [];
                    foreach ($options as $value => $label) $field['options'][] = ['value' => (string) $value, 'label' => $label];
                    $field['value'] = self::resolve($field, (string) $field['value']);
                    if ($options === []) {
                        $field['mode'] = 'unavailable';
                        $field['help'] = 'No active interview options are available.';
                    }
                }
                unset($field);
            }
            unset($group);
        }
        unset($page);
        return $pages;
    }

    public static function resolve(array $field, string $value): string
    {
        foreach ($field['options'] ?? [] as $option) {
            if ($option['value'] === $value) return $option['value'];
        }
        foreach ($field['options'] ?? [] as $option) {
            if (strcasecmp($option['value'], $value) === 0 || strcasecmp($option['label'], $value) === 0) return $option['value'];
        }
        // Previous settings stored abbreviated experience labels.
        $aliases = ['Entry' => 'entry', 'Junior' => 'junior', 'Mid-level' => 'mid', 'Senior' => 'senior', 'Leadership' => 'leadership'];
        $alias = $field['id'] === 'level' ? ($aliases[$value] ?? null) : null;
        if ($alias !== null && in_array($alias, $field['choices'], true)) return $alias;
        return in_array($field['value'], $field['choices'], true) ? $field['value'] : ($field['choices'][0] ?? '');
    }

    public static function hasInterviewInput(array $input): bool
    {
        return array_intersect_key($input, self::INTERVIEW_KEYS) !== [];
    }
}
