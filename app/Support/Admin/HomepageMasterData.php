<?php

namespace App\Support\Admin;

use App\Models\MasterDataOption;
use App\Support\Onboarding\SignupMasterData;
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
        'header_menu' => 'Header menu',
        'footer_menu' => 'Footer menu',
    ];

    public const DROPDOWN_GROUPS = [
        'careers_location' => 'Opportunity locations',
        'careers_type' => 'Employment types',
    ];

    public const GROUPS = self::NAVIGATION_GROUPS + self::DROPDOWN_GROUPS;

    /** Signup choices share the existing admin master-data editor, not the homepage editor. */
    public static function editableDropdownGroups(): array
    {
        return self::DROPDOWN_GROUPS + SignupMasterData::GROUPS;
    }

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
        $groups = $navigation ? self::NAVIGATION_GROUPS : self::editableDropdownGroups();

        return collect($groups)->map(fn (string $label, string $value) => [
            'value' => $value,
            'label' => $label,
            'can_add' => true,
            'is_icon' => false,
        ])->values()->all();
    }

    public static function options(bool $includeInactive = false, ?array $categories = null): array
    {
        $categories ??= array_keys(self::GROUPS);
        $query = MasterDataOption::query()->orderBy('sort_order')->orderBy('id');
        if (! $includeInactive) {
            $query->where('is_active', true);
        }
        if ($categories !== null) {
            $query->whereIn('category', $categories);
        }

        return $query->get(['id', 'category', 'value', 'label', 'sort_order', 'is_active'])
            ->groupBy('category')->map(fn (Collection $rows) => $rows->map(fn (MasterDataOption $row) => [
                'id' => $row->id,
                'value' => $row->value,
                'label' => $row->label,
                'sort_order' => $row->sort_order,
                'is_active' => $row->is_active,
            ])->values()->all())->all();
    }

    public static function isAllowedNewValue(string $category, string $value): bool
    {
        if (! array_key_exists($category, self::GROUPS) && ! array_key_exists($category, SignupMasterData::GROUPS)) {
            return false;
        }
        if (isset(self::ICON_VALUES[$category])) {
            return in_array($value, self::ICON_VALUES[$category], true);
        }
        if ($category === 'signup_experience') {
            return ctype_digit($value) && (string) (int) $value === $value && (int) $value <= 60;
        }
        if (in_array($category, ['signup_role', 'signup_certification'], true)) {
            return $value === trim($value)
                && mb_strlen($value) <= ($category === 'signup_role' ? 80 : 100)
                && preg_match('/^[^\p{C}<>]*[\p{L}\p{N}][^\p{C}<>]*$/uD', $value) === 1;
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

}
