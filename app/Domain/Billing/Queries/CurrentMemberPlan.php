<?php

namespace App\Domain\Billing\Queries;

use App\Models\User;
use App\Domain\Billing\Actions\SetTemporaryMembership;
use Illuminate\Support\Facades\DB;

final class CurrentMemberPlan
{
    public function code(User $user): string
    {
        // Apply non-billed grants only while the corresponding feature flag is enabled.
        if (SetTemporaryMembership::enabled()) {
            $temporary = DB::table('temporary_memberships')
                ->where('user_id', $user->getKey())
                ->value('plan_code');
            if (in_array($temporary, ['free', 'plus', 'pro'], true)) {
                return $temporary;
            }
        }

        return DB::table('subscriptions')
            ->join('plan_prices', 'subscriptions.plan_price_id', '=', 'plan_prices.id')
            ->join('plans', 'plan_prices.plan_id', '=', 'plans.id')
            ->where('subscriptions.user_id', $user->getKey())
            ->whereIn('subscriptions.status', ['active', 'cancel_at_term_end'])
            ->where('subscriptions.starts_at', '<=', now())
            ->where('subscriptions.ends_at', '>', now())
            ->whereIn('plans.code', ['plus', 'pro'])
            ->orderByDesc('subscriptions.ends_at')
            ->value('plans.code') ?? 'free';
    }

    public function dashboardCode(User $user): string
    {
        return match ($this->code($user)) {
            'plus' => 'premium', 'pro' => 'pro', default => 'free',
        };
    }
}
