<?php

namespace App\Support\Admin;

use App\Models\MasterDataOption;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

/** Source for the admin editor's supported dropdown categories. */
final class HomepageMasterData
{
    // Navigation links are managed separately from dropdown-only master data.
    public const NAVIGATION_GROUPS = [
        'hero_primary_url' => 'Hero primary destinations',
        'hero_secondary_url' => 'Hero secondary destinations',
        'skills_url' => 'Skill card destinations',
        'careers_feature_url' => 'Career feature destinations',
    ];

    public const DROPDOWN_GROUPS = [
        'pathway_step_icon' => 'Career pathway icons',
        'pathway_exam_icon' => 'Exam card icons',
        'skills_icon' => 'Skill card icons',
        'careers_feature_icon' => 'Career feature icons',
        'careers_opportunity_icon' => 'Opportunity card icons',
        'careers_location' => 'Opportunity locations',
        'careers_type' => 'Employment types',
    ];

    public const GROUPS = self::NAVIGATION_GROUPS + self::DROPDOWN_GROUPS;

    // Icons are implemented in the existing frontend and require a code release to add a new kind.
    public const ICON_VALUES = [
        'pathway_step_icon' => ['direction', 'learn', 'exams', 'skills', 'community'],
        'pathway_exam_icon' => ['pmp', 'scrum', 'simulation'],
        'skills_icon' => ['practice', 'scrum', 'simulation'],
        'careers_feature_icon' => ['learn', 'discuss', 'jobs', 'resume'],
        'careers_opportunity_icon' => ['manager', 'analyst', 'scrum'],
    ];

    public static function categories(bool $navigation = false): array
    {
        $groups = $navigation ? self::NAVIGATION_GROUPS : self::DROPDOWN_GROUPS;

        return collect($groups)->map(fn (string $label, string $value) => [
            'value' => $value,
            'label' => $label,
            'can_add' => ! array_key_exists($value, self::ICON_VALUES),
            'is_icon' => array_key_exists($value, self::ICON_VALUES),
        ])->values()->all();
    }

    public static function options(bool $includeInactive = false, ?array $categories = null): array
    {
        $query = MasterDataOption::query()->orderBy('sort_order')->orderBy('id');
        if (! $includeInactive) {
            $query->where('is_active', true);
        }
        if ($categories !== null) {
            $query->whereIn('category', $categories);
        }

        return $query->get(['id', 'category', 'value', 'label', 'sort_order', 'is_active', 'icon_path'])
            ->groupBy('category')->map(fn (Collection $rows) => $rows->map(fn (MasterDataOption $row) => [
                'id' => $row->id,
                'value' => $row->value,
                'label' => $row->label,
                'sort_order' => $row->sort_order,
                'is_active' => $row->is_active,
                'icon_url' => $row->icon_path ? \Illuminate\Support\Facades\Storage::disk('public')->url($row->icon_path) : null,
            ])->values()->all())->all();
    }

    /** Cached, public-safe overrides: icon codes remain unchanged in saved content. */
    public static function iconAssets(): array
    {
        return \Illuminate\Support\Facades\Cache::remember('pm-circle:homepage-icon-assets', 300, static function (): array {
            return MasterDataOption::query()->where('is_active', true)->whereNotNull('icon_path')
                ->whereIn('category', array_keys(self::ICON_VALUES))
                ->get(['category', 'value', 'icon_path'])
                ->groupBy('category')->map(fn (Collection $rows) => $rows->mapWithKeys(
                    fn (MasterDataOption $row) => [$row->value => \Illuminate\Support\Facades\Storage::disk('public')->url($row->icon_path)]
                )->all())->all();
        });
    }

    public static function isAllowedNewValue(string $category, string $value): bool
    {
        if (! array_key_exists($category, self::GROUPS)) {
            return false;
        }
        if (isset(self::ICON_VALUES[$category])) {
            return in_array($value, self::ICON_VALUES[$category], true);
        }
        if (in_array($category, ['careers_location', 'careers_type'], true)) {
            return preg_match('/^[\p{L}\p{N} .,&()\/-]{1,100}$/uD', $value) === 1;
        }
        // URL dropdowns must resolve to existing same-site GET routes. Never allow external URLs or admin endpoints.
        if (preg_match('~^/[a-z0-9/-]{0,158}$~D', $value) !== 1 || str_starts_with($value, '/admin') || str_contains($value, '//')) {
            return false;
        }
        try {
            $route = Route::getRoutes()->match(Request::create($value, 'GET'));
            return ! in_array('pm.admin', $route->gatherMiddleware(), true)
                && ! str_starts_with($route->uri(), 'admin');
        } catch (NotFoundHttpException | MethodNotAllowedHttpException $exception) {
            return false;
        }
    }

    /** Prevent retiring an option while the public homepage still uses it. */
    public static function inUse(MasterDataOption $option, array $content): bool
    {
        $values = match ($option->category) {
            'hero_primary_url' => [$content['hero']['primary_url'] ?? '/register'],
            'hero_secondary_url' => [$content['hero']['secondary_url'] ?? '/community'],
            'pathway_step_icon' => array_column($content['pathway']['steps']['items'] ?? [], 'icon'),
            'pathway_exam_icon' => array_column($content['pathway']['exams']['items'] ?? [], 'icon'),
            'skills_url' => array_column($content['skills']['items'] ?? [], 'url'),
            'skills_icon' => array_column($content['skills']['items'] ?? [], 'icon'),
            'careers_feature_url' => array_column($content['careers']['features'] ?? [], 'url'),
            'careers_feature_icon' => array_column($content['careers']['features'] ?? [], 'icon'),
            'careers_opportunity_icon' => array_column($content['careers']['opportunities'] ?? [], 'icon'),
            'careers_location' => array_column($content['careers']['opportunities'] ?? [], 'location'),
            'careers_type' => array_column($content['careers']['opportunities'] ?? [], 'type'),
            default => [],
        };

        return in_array($option->value, $values, true);
    }
}
