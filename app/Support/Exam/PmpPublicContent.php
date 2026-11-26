<?php

namespace App\Support\Exam;

use App\Models\HomePageContent;
use Illuminate\Support\Facades\Cache;

final class PmpPublicContent
{
    public const KEY = 'pmp_public';

    private const CACHE_KEY = 'pm-circle:pmp-public-content';

    public const MAX_PLAN_ROWS = 40;

    public static function defaults(): array
    {
        return self::withDefaults([]);
    }

    /** Shared cached content: public page and shared site footer use the same read. */
    public static function load(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, static function (): array {
            $record = HomePageContent::query()->where('key', self::KEY)->first(['content']);

            return $record ? self::withDefaults($record->content ?? []) : self::defaults();
        });
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** Merge named objects but replace repeatable lists in full (including removed rows). */
    public static function withDefaults(array $content): array
    {
        $legacy = self::merge(config('pmp-public'), $content);
        $legacy['footer'] = $content[\App\Support\Admin\SiteFooterContent::KEY] ?? \App\Support\Admin\SiteFooterContent::fromLegacy($legacy['footer']);
        unset($legacy[\App\Support\Admin\SiteFooterContent::KEY]);

        return $legacy;
    }

    private static function merge(array $defaults, array $content): array
    {
        foreach ($content as $key => $value) {
            if (is_array($value) && isset($defaults[$key]) && is_array($defaults[$key])
                && ! array_is_list($value) && ! array_is_list($defaults[$key])) {
                $defaults[$key] = self::merge($defaults[$key], $value);
            } else {
                $defaults[$key] = $value;
            }
        }

        return $defaults;
    }
}
