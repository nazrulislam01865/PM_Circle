<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Identity\Services\ProfileCompleteness;
use App\Models\User;

/** The one member navigation data contract shared by all signed-in pages. */
final class MemberShell
{
    public function __construct(private readonly CurrentMemberPlan $plans) {}

    public function forMember(User $user): array
    {
        $user->loadMissing('profile');

        $plan = $this->plans->code($user);
        return [
            'plan' => $plan === 'plus' ? 'premium' : $plan,
            'featureAccess' => app(\App\Domain\Billing\Queries\MemberFeatureAccess::class)->forPlan($plan),
            'member' => [
                'id' => $user->getKey(),
                'name' => $user->name,
                'role' => $user->profile?->role,
                'avatar_path' => $user->profile?->avatar_path,
                'completion' => app(ProfileCompleteness::class)->profilePercentage($user),
            ],
            'isDemo' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
        ];
    }
}
