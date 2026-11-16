<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Paid, verified subscription cycles only; never treats the demo plan as a payment. */
final class AiSubscriptionGrantService
{
    public function __construct(private readonly AiCreditService $credits) {}

    public function grantDueCycles(): int
    {
        if (! config('pm-ai.subscription_grants_enabled')) {
            return 0;
        }
        // Resolve the two active plan allowance snapshots once, not once per subscriber.
        $allowances = DB::table('ai_plan_allowances')
            ->whereIn('plan_code', ['plus', 'pro'])
            ->where('active_from_utc', '<=', now())
            ->orderByDesc('active_from_utc')->orderByDesc('version')
            ->get()->unique('plan_code')->keyBy('plan_code');
        if ($allowances->isEmpty()) {
            return 0;
        }
        $rows = DB::table('subscriptions as s')
            ->join('plan_prices as pp', 'pp.id', '=', 's.plan_price_id')
            ->join('plans as p', 'p.id', '=', 'pp.plan_id')
            ->whereIn('s.status', ['active', 'cancel_at_term_end'])
            ->where('s.starts_at', '<=', now())->where('s.ends_at', '>', now())
            ->whereIn('p.code', ['plus', 'pro'])
            ->select(['s.id', 's.user_id', 's.starts_at', 's.ends_at', 'p.code'])
            ->lazyById(250, 's.id', 'id');
        $count = 0;
        foreach ($rows as $subscription) {
            $allowance = $allowances->get($subscription->code);
            if (! $allowance || $allowance->monthly_credits < 1) {
                continue;
            }
            $start = Carbon::parse($subscription->starts_at)->utc();
            $end = Carbon::parse($subscription->ends_at)->utc();
            $months = 0;
            while ($months < 60 && $start->copy()->addMonthsNoOverflow($months + 1)->lte(now())) {
                $months++;
            }
            $cycleStart = $start->copy()->addMonthsNoOverflow($months);
            $cycleEnd = $start->copy()->addMonthsNoOverflow($months + 1);
            if ($cycleEnd->gt($end)) {
                $cycleEnd = $end;
            }
            if (Carbon::parse($allowance->active_from_utc)->gt($cycleStart) || $cycleEnd->isPast()) {
                continue;
            }
            $sourceRef = sprintf('subscription:%d:cycle:%s', $subscription->id,
                $cycleStart->format('Y-m-d\\TH:i:s\\Z'));
            // Most invocations are no-ops. Avoid acquiring wallet and grant locks for
            // a monthly credit already issued by an earlier scheduler run.
            $exists = DB::table('ai_credit_grants')->where('user_id', $subscription->user_id)
                ->where('source', 'subscription_cycle')->where('source_ref', $sourceRef)->exists();
            if (! $exists && $this->credits->grant($subscription->user_id, 'subscription_cycle',
                $sourceRef, (int) $allowance->monthly_credits, $cycleEnd)) {
                $count++;
            }
        }
        return $count;
    }
}
