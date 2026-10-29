<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;

/** The one member navigation data contract shared by all signed-in pages. */
final class MemberShell
{
    public function __construct(private readonly CurrentMemberPlan $plans) {}

    public function forMember(User $user): array
    {
        $user->loadMissing('profile');

        return [
            'plan' => $this->plans->dashboardCode($user),
            'member' => [
                'name' => $user->name,
                'role' => $user->profile?->role,
                'completion' => 0,
            ],
            'isDemo' => app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled'),
        ];
    }
}
