<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class AiQuotaAdminController extends Controller
{
    public function index(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        return response()->json([
            'policies' => DB::table('ai_chat_limit_policies')->orderByDesc('id')->limit(100)->get(),
            'overrides' => DB::table('ai_chat_user_overrides')->orderByDesc('id')->limit(100)
                ->get(['id', 'user_id', 'feature_scope', 'max_daily', 'max_cycle',
                    'max_per_conversation', 'max_concurrent', 'max_cycle_tokens', 'starts_at_utc',
                    'ends_at_utc', 'created_by', 'reason', 'status']),
            'allowances' => DB::table('ai_plan_allowances')->orderByDesc('id')->limit(30)->get(),
        ]);
    }

    /** Preview a member's effective quotas without changing their counters or wallet. */
    public function preview(Request $request, AiAdminAccess $access,
        \App\Domain\AI\Services\AiChatQuotaService $quotas): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'feature' => ['required', Rule::in(['pmp', 'ask_ai'])],
            'conversation_id' => ['nullable', 'integer', 'min:1'],
        ]);
        $member = \App\Models\User::findOrFail($data['user_id']);
        try {
            $result = $quotas->summary($member,
                $data['feature'] === 'pmp' ? 'pmp_explain' : 'ask_ai',
                $data['conversation_id'] ?? null);
            $result['user_id'] = $member->id;
            $result['credits_available'] = (int) (DB::table('ai_credit_wallets')
                ->where('user_id', $member->id)->value('available') ?? 0);
            return response()->json($result);
        } catch (\App\Domain\AI\Support\AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function publishPolicy(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $data = $request->validate([
            'plan_code' => ['required', Rule::in(['free', 'plus', 'pro'])],
            'feature_scope' => ['required', Rule::in(['feature:pmp', 'feature:ask_ai'])],
            'max_daily' => ['required', 'integer', 'min:0', 'max:10000'],
            'max_cycle' => ['required', 'integer', 'min:0', 'max:100000'],
            'max_per_conversation' => ['required', 'integer', 'min:0', 'max:10000'],
            'max_concurrent' => ['required', 'integer', 'min:0', 'max:100'],
            'max_cycle_tokens' => ['required_if:feature_scope,feature:pmp', 'prohibited_if:feature_scope,feature:ask_ai', 'nullable', 'integer', 'min:0', 'max:250000'],
            'active_from_utc' => ['required', 'date', 'after_or_equal:now'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $version = DB::transaction(function () use ($data, $request, $access): int {
            // Serialize version allocation across different administrators using one shared row.
            DB::table('users')->orderBy('id')->lockForUpdate()->first(['id']);
            $version = (int) DB::table('ai_chat_limit_policies')
                ->where('plan_code', $data['plan_code'])
                ->where('feature_scope', $data['feature_scope'])->max('version') + 1;
            $id = DB::table('ai_chat_limit_policies')->insertGetId([
                ...collect($data)->except('reason')->all(), 'version' => $version,
                'enabled' => true, 'approved_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'chat_policy.publish', 'ai_chat_limit_policies',
                $id, null, ['plan' => $data['plan_code'], 'version' => $version], $data['reason']);
            return $version;
        }, 3);
        return response()->json(['version' => $version], 201);
    }

    public function override(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'feature_scope' => ['required', Rule::in(['feature:pmp', 'feature:ask_ai'])],
            'max_daily' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'max_cycle' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'max_per_conversation' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'max_concurrent' => ['nullable', 'integer', 'min:0', 'max:100'],
            'max_cycle_tokens' => ['prohibited_if:feature_scope,feature:ask_ai', 'nullable', 'integer', 'min:0', 'max:250000'],
            'starts_at_utc' => ['required', 'date'],
            'ends_at_utc' => ['nullable', 'date', 'after:starts_at_utc'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        if (! collect(['max_daily', 'max_cycle', 'max_per_conversation', 'max_concurrent', 'max_cycle_tokens'])
            ->contains(fn ($field) => isset($data[$field]))) {
            abort(422, 'Specify at least one limit dimension.');
        }
        $id = DB::transaction(function () use ($data, $request, $access): int {
            DB::table('users')->where('id', $data['user_id'])->lockForUpdate()->first(['id']);
            $overlaps = DB::table('ai_chat_user_overrides')->where('user_id', $data['user_id'])
                ->where('feature_scope', $data['feature_scope'])->where('status', 'active')
                ->where('starts_at_utc', '<', $data['ends_at_utc'] ?? '9999-12-31')
                ->where(fn ($q) => $q->whereNull('ends_at_utc')
                    ->orWhere('ends_at_utc', '>', $data['starts_at_utc']))->exists();
            abort_if($overlaps, 409, 'An active override overlaps this time window.');
            $id = DB::table('ai_chat_user_overrides')->insertGetId([
                ...collect($data)->except('user_id')->all(),
                'user_id' => $data['user_id'], 'created_by' => $request->user()->id,
                'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'chat_override.create',
                'ai_chat_user_overrides', $id, null, ['user_id' => $data['user_id']], $data['reason']);
            return $id;
        }, 3);
        return response()->json(['id' => $id], 201);
    }

    public function revokeOverride(Request $request, int $override, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        DB::transaction(function () use ($request, $override, $access, $data): void {
            $row = DB::table('ai_chat_user_overrides')->where('id', $override)
                ->lockForUpdate()->first();
            abort_unless($row, 404);
            if ($row->status !== 'active') {
                return;
            }
            DB::table('ai_chat_user_overrides')->where('id', $override)
                ->update(['status' => 'revoked', 'updated_at' => now()]);
            $access->audit($request->user()->id, 'chat_override.revoke',
                'ai_chat_user_overrides', $override, ['status' => $row->status],
                ['status' => 'revoked'], $data['reason']);
        });
        return response()->json(['status' => 'revoked']);
    }

    public function publishAllowance(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_credits');
        $data = $request->validate([
            'plan_code' => ['required', Rule::in(['plus', 'pro'])],
            'monthly_credits' => ['required', 'integer', 'min:0', 'max:100000'],
            'active_from_utc' => ['required', 'date', 'after_or_equal:now'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $version = DB::transaction(function () use ($request, $data, $access): int {
            // Serialize version allocation across different administrators using one shared row.
            DB::table('users')->orderBy('id')->lockForUpdate()->first(['id']);
            $version = (int) DB::table('ai_plan_allowances')->where('plan_code', $data['plan_code'])
                ->max('version') + 1;
            $id = DB::table('ai_plan_allowances')->insertGetId([
                'plan_code' => $data['plan_code'], 'version' => $version,
                'monthly_credits' => $data['monthly_credits'],
                'active_from_utc' => $data['active_from_utc'],
                'approved_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'allowance.publish', 'ai_plan_allowances',
                $id, null, ['plan' => $data['plan_code'], 'version' => $version], $data['reason']);
            return $version;
        });
        return response()->json(['version' => $version], 201);
    }
}
