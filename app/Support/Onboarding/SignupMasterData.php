<?php

namespace App\Support\Onboarding;

use App\Models\MasterDataOption;
use Illuminate\Support\Collection;

/** Active administrator-managed choices for the professional signup step. */
final class SignupMasterData
{
    public const GROUPS = [
        'signup_role' => 'Signup roles',
        'signup_experience' => 'Signup experience',
        'signup_certification' => 'Signup certifications',
    ];

    /** @return array<string, array<int, array{value: string, label: string}>> */
    public static function options(): array
    {
        return MasterDataOption::query()
            ->whereIn('category', array_keys(self::GROUPS))
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['category', 'value', 'label'])
            ->groupBy('category')
            ->map(fn (Collection $options) => $options->map(fn (MasterDataOption $option) => [
                'value' => $option->value,
                'label' => $option->label,
            ])->values()->all())
            ->all();
    }
}
