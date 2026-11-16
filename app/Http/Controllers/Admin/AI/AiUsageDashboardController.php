<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiChatQuotaService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/** Read-only, bounded admin views. All mutations reuse the audited AI endpoints. */
final class AiUsageDashboardController extends Controller
{
    public function index(Request $request, AiAdminAccess $access): Response
    {
        $access->authorize($request->user(), 'ai.view_reports');
        $permissions = DB::table('ai_admin_permissions')->where('user_id', $request->user()->id)
            ->whereIn('permission', ['ai.view_reports', 'ai.manage_quotas', 'ai.manage_credits'])
            ->pluck('permission')->all();
        $canQuotas = in_array('ai.manage_quotas', $permissions, true);
        $canCredits = in_array('ai.manage_credits', $permissions, true);

        $since = now()->subDays(30);
        $totals = DB::table('ai_requests')->where('created_at', '>=', $since)
            ->selectRaw('COUNT(*) as total_requests')
            ->selectRaw('COALESCE(SUM(input_tokens), 0) as input_tokens')
            ->selectRaw('COALESCE(SUM(output_tokens), 0) as output_tokens')
            ->selectRaw('COALESCE(SUM(final_charge), 0) as member_credits')
            ->selectRaw('COALESCE(SUM(cost_usd), 0) as cost_usd')
            ->first();
        $byFeature = DB::table('ai_requests')->where('created_at', '>=', $since)
            ->select('feature_code', 'status')->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(input_tokens + output_tokens), 0) as tokens')
            ->selectRaw('COALESCE(SUM(cost_usd), 0) as cost_usd')
            ->groupBy('feature_code', 'status')->orderBy('feature_code')->get();

        // A constant-size snapshot: latest effective and next scheduled policy per plan/feature.
        // Window functions keep query count constant as published policy history grows.
        $policies = collect();
        if ($canQuotas) {
            $current = DB::table('ai_chat_limit_policies')->where('enabled', true)
                ->where('active_from_utc', '<=', now())->select('*')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY plan_code, feature_scope ORDER BY active_from_utc DESC, version DESC) AS position');
            $upcoming = DB::table('ai_chat_limit_policies')->where('enabled', true)
                ->where('active_from_utc', '>', now())->select('*')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY plan_code, feature_scope ORDER BY active_from_utc ASC, version ASC) AS position');
            $policies = DB::query()->fromSub($current, 'p')->where('position', 1)->get()
                ->concat(DB::query()->fromSub($upcoming, 'p')->where('position', 1)->get());
        }
        $overrides = $canQuotas ? DB::table('ai_chat_user_overrides as o')
            ->join('users as u', 'u.id', '=', 'o.user_id')
            ->select('o.*', 'u.name as member_name', 'u.email as member_email')
            ->orderByDesc('o.id')->limit(40)->get() : [];
        $allowances = collect();
        if ($canCredits) {
            $currentAllowances = DB::table('ai_plan_allowances')
                ->where('active_from_utc', '<=', now())->select('*')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY plan_code ORDER BY active_from_utc DESC, version DESC) AS position');
            $futureAllowances = DB::table('ai_plan_allowances')
                ->where('active_from_utc', '>', now())->select('*')
                ->selectRaw('ROW_NUMBER() OVER (PARTITION BY plan_code ORDER BY active_from_utc ASC, version ASC) AS position');
            $allowances = DB::query()->fromSub($currentAllowances, 'a')
                ->where('position', 1)->get()
                ->concat(DB::query()->fromSub($futureAllowances, 'a')->where('position', 1)->get());
        }
        $audit = DB::table('ai_audit_events as e')
            ->leftJoin('users as u', 'u.id', '=', 'e.actor_id')
            ->select('e.id', 'e.action', 'e.subject_type', 'e.subject_id', 'e.reason',
                'e.created_at', 'u.name as actor_name')
            ->orderByDesc('e.id')->limit(35)->get();

        return Inertia::render('admin/AiUsageManagement', [
            'capabilities' => ['quotas' => $canQuotas, 'credits' => $canCredits],
            'configuration' => [
                'enabled' => (bool) config('pm-ai.enabled'),
                'hard_limits' => [
                    'daily' => config('pm-ai.hard_chat_daily'),
                    'cycle' => config('pm-ai.hard_chat_cycle'),
                    'conversation' => config('pm-ai.hard_chat_conversation'),
                    'concurrent' => config('pm-ai.hard_chat_concurrent'),
                    'pmp_tokens' => config('pm-ai.hard_pmp_cycle_tokens'),
                ],
            ],
            'totals' => $totals,
            'byFeature' => $byFeature,
            'policies' => $policies,
            'overrides' => $overrides,
            'allowances' => $allowances,
            'audit' => $audit,
        ]);
    }

    /** Search is opt-in, minimum 2 characters, and never enumerates the entire directory. */
    public function members(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $input = $request->validate(['q' => ['required', 'string', 'min:2', 'max:80']]);
        $needle = mb_strtolower(trim($input['q']));
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $needle);

        $members = DB::table('users')->where('is_admin', false)
            ->where(function ($query) use ($escaped): void {
                $query->whereRaw("LOWER(email) LIKE ? ESCAPE '\\'", ["%{$escaped}%"])
                    ->orWhereRaw("LOWER(name) LIKE ? ESCAPE '\\'", ["%{$escaped}%"]);
            })->orderBy('id')->limit(12)->get(['id', 'name', 'email']);

        return response()->json(['members' => $members]);
    }

    /** Member detail is owner-scoped by an explicit admin permission, with no private prompt text. */
    public function member(Request $request, int $user, AiAdminAccess $access,
        AiChatQuotaService $quotas, CurrentMemberPlan $plans): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $member = User::query()->where('is_admin', false)->findOrFail($user);
        $features = [];
        foreach (['pmp' => 'pmp_explain', 'ask_ai' => 'ask_ai'] as $name => $code) {
            try {
                $features[$name] = $quotas->summary($member, $code);
            } catch (AiFailure $failure) {
                if (! in_array($failure->safeCode, ['CHAT_POLICY_NOT_CONFIGURED', 'NOT_ENTITLED'], true)) {
                    throw $failure;
                }
                $features[$name] = ['enabled' => false, 'code' => $failure->safeCode];
            }
        }
        $wallet = DB::table('ai_credit_wallets')->where('user_id', $member->id)
            ->first(['available', 'reserved', 'spent_lifetime']);
        $requests = DB::table('ai_requests')->where('user_id', $member->id)
            ->orderByDesc('id')->limit(15)
            ->get(['request_uuid', 'feature_code', 'status', 'input_tokens', 'output_tokens',
                'final_charge', 'cost_usd', 'created_at']);

        return response()->json([
            'member' => $member->only(['id', 'name', 'email']),
            'plan' => $plans->code($member),
            'limits' => $features,
            'wallet' => $wallet ?? ['available' => 0, 'reserved' => 0, 'spent_lifetime' => 0],
            'requests' => $requests,
        ]);
    }
}
