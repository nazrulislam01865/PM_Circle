<?php

namespace App\Domain\Identity\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ActivateFreeMembership
{
    public function execute(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($locked->onboarding_step < 3) $locked->update(['onboarding_step' => 3]);
            // Free entitlement is intrinsic and no paid subscription is granted here.
        });
    }
}
