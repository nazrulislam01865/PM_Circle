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

    /** Real subscription dates only; temporary development grants have no fabricated expiry. */
    public function details(User $user): array
    {
        if (SetTemporaryMembership::enabled()) {
            $temporary = DB::table('temporary_memberships')
                ->where('user_id', $user->getKey())->value('plan_code');
            if (in_array($temporary, ['free', 'plus', 'pro'], true)) {
                return [
                    'code' => $temporary, 'source' => 'complimentary',
                    'starts_at' => null, 'ends_at' => null,
                ];
            }
        }

        $subscription = DB::table('subscriptions')
            ->join('plan_prices', 'subscriptions.plan_price_id', '=', 'plan_prices.id')
            ->join('plans', 'plan_prices.plan_id', '=', 'plans.id')
            ->where('subscriptions.user_id', $user->getKey())
            ->whereIn('subscriptions.status', ['active', 'cancel_at_term_end'])
            ->where('subscriptions.starts_at', '<=', now())
            ->where('subscriptions.ends_at', '>', now())
            ->whereIn('plans.code', ['plus', 'pro'])
            ->orderByDesc('subscriptions.ends_at')
            ->first(['plans.code', 'subscriptions.starts_at', 'subscriptions.ends_at']);

        return $subscription ? [
            'code' => $subscription->code, 'source' => 'subscription',
            'starts_at' => $subscription->starts_at, 'ends_at' => $subscription->ends_at,
        ] : [
            'code' => 'free', 'source' => 'none', 'starts_at' => null, 'ends_at' => null,
        ];
    }

    public function dashboardCode(User $user): string
    {
        return match ($this->code($user)) {
            'plus' => 'premium', 'pro' => 'pro', default => 'free',
        };
    }
}
