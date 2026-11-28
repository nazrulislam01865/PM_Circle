<?php

namespace App\Domain\Billing\Queries;

use App\Domain\AI\Services\PmpAiUsageReadModel;
use App\Models\User;
use Illuminate\Support\Facades\DB;

final class MemberPlanUsage
{
    public function forMember(User $user): array
    {
        $plan = app(CurrentMemberPlan::class)->details($user);
        $plan['next_term_at'] = $plan['source'] === 'subscription' ? DB::table('subscriptions')
            ->where('user_id', $user->id)->whereIn('status', ['active', 'cancel_at_term_end'])
            ->where('starts_at', '>=', $plan['ends_at'])->where('ends_at', '>', now())->min('starts_at') : null;
        $access = app(MemberFeatureAccess::class)->forPlan($plan['code']);
        $tokens = $access['pmp'] ? app(PmpAiUsageReadModel::class)->summary($user) : ['configured' => false];
        if (($tokens['allocated'] ?? 0) < 1) $tokens['configured'] = false;
        $start = now('Asia/Dhaka')->startOfMonth()->utc();
        $end = $start->copy()->setTimezone('Asia/Dhaka')->addMonthNoOverflow()->utc();
        $usage = DB::table('ai_requests')->where('user_id', $user->id)
            ->where('status', 'completed')->where('completed_at', '>=', $start)->where('completed_at', '<', $end)
            ->groupBy('feature_code')->select('feature_code')->selectRaw('SUM(input_tokens + output_tokens) AS tokens, COUNT(*) AS requests')->get()->map(fn ($row) => ['feature_code' => $row->feature_code, 'tokens' => (int) $row->tokens, 'requests' => (int) $row->requests]);
        $credits = DB::table('ai_credit_grants')->where('user_id', $user->id)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->selectRaw('COALESCE(SUM(available), 0) AS available, COALESCE(SUM(reserved), 0) AS reserved')->first();
        return [
            'plan' => $plan, 'access' => $access, 'tokens' => $tokens,
            'usage' => $usage, 'periodStart' => $start->toISOString(), 'periodEnd' => $end->toISOString(),
            'credits' => ['available' => (int) $credits->available, 'reserved' => (int) $credits->reserved],
            'interviewSessions' => DB::table('interview_sessions')->where('user_id', $user->id)->where('status', 'completed')->count(),
            'interviewEnabled' => $access['interview'] && (bool) config('pm-interview.enabled'),
            'examAttempts' => DB::table('pmp_exam_attempts')->where('user_id', $user->id)->where('status', 'completed')->count(),
        ];
    }
}
