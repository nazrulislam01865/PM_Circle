<?php

namespace App\Support\Admin;

use App\Models\MasterDataOption;
use Illuminate\Support\Facades\Cache;

final class SiteNavigation
{
    private const CACHE_KEY = 'pm-circle:site-navigation';

    private const DEFAULTS = [
        'header' => [
            ['href' => '/daily-challenge', 'label' => 'Daily Challenge'],
            ['href' => '/community', 'label' => 'Community Feed'],
            ['href' => '/learning', 'label' => 'Learn & Practice'],
            ['href' => '/careers', 'label' => 'Careers'],
            ['href' => '/members', 'label' => 'Members'],
            ['href' => '/pm-trends', 'label' => 'PM Trends'],
        ],
        'footer' => [
            ['href' => '/about', 'label' => 'About'],
            ['href' => '/community', 'label' => 'Community guidelines'],
            ['href' => '/privacy', 'label' => 'Privacy'],
            ['href' => '/terms', 'label' => 'Terms'],
        ],
    ];

    /** Menu-only data. Never expose other master-data categories publicly. */
    public static function links(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, static function (): array {
            $items = MasterDataOption::query()
                ->whereIn('category', ['header_menu', 'footer_menu'])
                ->orderBy('sort_order')->orderBy('id')
                ->get(['category', 'value', 'label', 'is_active']);
            $links = [];
            foreach (['header' => 'header_menu', 'footer' => 'footer_menu'] as $group => $category) {
                $rows = $items->where('category', $category);
                $links[$group] = $rows->isEmpty() ? self::DEFAULTS[$group]
                    : $rows->where('is_active', true)->map(fn (MasterDataOption $item) => [
                        'href' => $item->value, 'label' => $item->label,
                    ])->values()->all();
            }

            return $links;
        });
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
