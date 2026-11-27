<?php

namespace App\Domain\Billing\Queries;

use App\Models\User;
use App\Domain\Billing\Actions\SetTemporaryMembership;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

final class CurrentMemberPlan
{
    /** Shared predicate for all entitlement reads, including the member directory. */
    public static function activeComplimentaryGrants(): Builder
    {
        $now = now();

        return DB::table('temporary_memberships')->where(function (Builder $query) use ($now): void {
            $query->where(fn (Builder $legacy) => $legacy->whereNull('starts_at')->whereNull('ends_at'))
                ->orWhere(fn (Builder $dated) => $dated->where('starts_at', '<=', $now)->where('ends_at', '>', $now));
        });
    }

    public function code(User $user): string
    {
        // Apply non-billed grants only while the corresponding feature flag is enabled.
        if (SetTemporaryMembership::enabled()) {
            $temporary = self::activeComplimentaryGrants()
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

    /** Paid terms and explicitly recorded non-billed terms; legacy dates remain unknown. */
    public function details(User $user): array
    {
        if (SetTemporaryMembership::enabled()) {
            $temporary = self::activeComplimentaryGrants()
                ->where('user_id', $user->getKey())->first(['plan_code', 'months', 'starts_at', 'ends_at']);
            if ($temporary && in_array($temporary->plan_code, ['free', 'plus', 'pro'], true)) {
                return [
                    'code' => $temporary->plan_code, 'source' => 'complimentary', 'status' => 'complimentary',
                    'months' => $temporary->months === null ? null : (int) $temporary->months,
                    'starts_at' => $temporary->starts_at, 'ends_at' => $temporary->ends_at,
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
            ->first(['plans.code', 'subscriptions.starts_at', 'subscriptions.ends_at', 'subscriptions.status', 'subscriptions.cancel_at_term_end', 'plan_prices.months']);

        return $subscription ? [
            'code' => $subscription->code, 'source' => 'subscription',
            'status' => $subscription->cancel_at_term_end ? 'cancel_at_term_end' : $subscription->status, 'months' => (int) $subscription->months,
            'starts_at' => $subscription->starts_at, 'ends_at' => $subscription->ends_at,
        ] : [
            'code' => 'free', 'source' => 'none', 'status' => 'free', 'months' => null, 'starts_at' => null, 'ends_at' => null,
        ];
    }

    public function dashboardCode(User $user): string
    {
        return match ($this->code($user)) {
            'plus' => 'premium', 'pro' => 'pro', default => 'free',
        };
    }
}
