<?php

namespace App\Support\Community;

use App\Models\HomePageContent;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

final class ReactionIconCatalog
{
    public const KEY = 'reaction_icons';

    public const MAX_CUSTOM = 12;

    private const CACHE_KEY = 'pm-circle:reaction-icons';

    public const LABELS = [
        'like' => 'Like',
        'love' => 'Love',
        'care' => 'Care',
        'haha' => 'Haha',
        'wow' => 'Wow',
        'sad' => 'Sad',
        'angry' => 'Angry',
    ];

    /** A single cached settings read powers the admin editor, validators and Inertia props. */
    public static function configuration(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, static function (): array {
            $content = HomePageContent::query()->where('key', self::KEY)->value('content');

            return is_array($content) ? $content : (json_decode((string) $content, true) ?: []);
        });
    }

    /** Custom types remain registered after deactivation, preserving all historical reactions. */
    public static function custom(): array
    {
        $raw = self::configuration()['custom_reactions'] ?? [];
        if (! is_array($raw)) {
            return [];
        }

        $custom = [];
        foreach ($raw as $type => $item) {
            if (! is_string($type) || ! preg_match('/\A[a-z][a-z0-9_]{1,11}\z/D', $type)
                || isset(self::LABELS[$type]) || $type === 'save' || ! is_array($item)) {
                continue;
            }
            $label = trim((string) ($item['label'] ?? ''));
            if ($label === '' || mb_strlen($label) > 40) {
                continue;
            }
            $path = $item['path'] ?? null;
            $custom[$type] = [
                'label' => $label,
                'path' => is_string($path) && str_starts_with($path, 'reactions/') ? $path : null,
                'active' => ($item['active'] ?? true) === true,
            ];
        }

        return $custom;
    }

    public static function definitions(): array
    {
        $urls = self::urls();
        $definitions = [];
        foreach (self::LABELS as $type => $label) {
            $definitions[] = ['type' => $type, 'label' => $label, 'builtin' => true, 'active' => true,
                'url' => $urls[$type] ?? null];
        }
        foreach (self::custom() as $type => $item) {
            $definitions[] = ['type' => $type, 'label' => $item['label'], 'builtin' => false,
                'active' => $item['active'], 'url' => $urls[$type] ?? null];
        }

        return $definitions;
    }

    public static function activeTypes(): array
    {
        return [...array_keys(self::LABELS), ...array_keys(array_filter(
            self::custom(), static fn (array $item): bool => $item['active']
        ))];
    }

    public static function allTypes(): array
    {
        return [...array_keys(self::LABELS), ...array_keys(self::custom())];
    }

    /** Keep the original shape for existing seven-icon installations and tests. */
    public static function paths(): array
    {
        $stored = self::configuration();
        $paths = [];
        foreach (self::LABELS as $type => $label) {
            $path = $stored[$type] ?? null;
            $paths[$type] = is_string($path) && str_starts_with($path, 'reactions/') ? $path : null;
        }
        foreach (self::custom() as $type => $item) {
            $paths[$type] = $item['path'];
        }

        return $paths;
    }

    /** Missing uploads continue to use the Lucide built-in or generic custom fallback. */
    public static function urls(): array
    {
        $urls = [];
        foreach (self::paths() as $type => $path) {
            if ($path !== null) {
                $urls[$type] = Storage::disk('public')->url($path);
            }
        }

        return $urls;
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
