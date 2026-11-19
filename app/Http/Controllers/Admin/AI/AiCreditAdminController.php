<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiCreditService;
use App\Domain\AI\Services\AiExecutionService;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AiCreditAdminController extends Controller
{
    public function packages(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_packages');
        return response()->json(DB::table('ai_credit_packages')->orderByDesc('id')
            ->get(['id', 'code', 'version', 'title', 'credits', 'price_minor', 'currency',
                'active', 'expires_after_days', 'created_at']));
    }

    public function publishPackage(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_packages');
        $data = $request->validate([
            'code' => ['required', 'string', 'max:55', 'regex:/^[a-z][a-z0-9_-]*$/'],
            'title' => ['required', 'string', 'max:120'],
            'credits' => ['required', 'integer', 'min:1', 'max:100000'],
            'price_minor' => ['required', 'integer', 'min:1', 'max:100000000'],
            'currency' => ['required', 'in:BDT'],
            'expires_after_days' => ['nullable', 'integer', 'between:1,3650'],
            'active' => ['required', 'boolean'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        if ($data['active'] && (! config('pm-ai.purchases_enabled')
            || ! app(\App\Domain\Billing\Payments\Services\PaymentGatewayManager::class)->ready())) {
            abort(503, 'A verified payment gateway must be enabled before selling packages.');
        }
        $version = DB::transaction(function () use ($data, $request, $access): int {
            DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first(['id']);
            $version = (int) DB::table('ai_credit_packages')->where('code', $data['code'])
                ->max('version') + 1;
            $id = DB::table('ai_credit_packages')->insertGetId([
                ...collect($data)->except(['reason', 'code'])->all(),
                'code' => $data['code'], 'version' => $version,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'packages.publish', 'ai_credit_packages',
                $id, null, ['code' => $data['code'], 'version' => $version], $data['reason']);
            return $version;
        }, 3);
        return response()->json(['version' => $version], 201);
    }

    public function disablePackage(Request $request, int $package, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_packages');
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        DB::transaction(function () use ($request, $package, $access, $data): void {
            $row = DB::table('ai_credit_packages')->where('id', $package)->lockForUpdate()->first();
            abort_unless($row, 404);
            DB::table('ai_credit_packages')->where('id', $package)->update([
                'active' => false, 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'packages.disable', 'ai_credit_packages',
                $package, ['active' => $row->active], ['active' => false], $data['reason']);
        });
        return response()->json(['active' => false]);
    }

    public function grant(Request $request, AiAdminAccess $access,
        AiCreditService $credits): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_credits');
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'credits' => ['required', 'integer', 'min:1', 'max:500'], // Larger corrections need dual control, not a single request.
            'external_reference' => ['required', 'string', 'max:110'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'reason' => ['required', 'string', 'max:500'],
        ]);
        $created = DB::transaction(function () use ($request, $access, $credits, $data): bool {
            $created = $credits->grant($data['user_id'], 'admin_adjustment',
                $data['external_reference'], $data['credits'],
                isset($data['expires_at']) ? \Illuminate\Support\Carbon::parse($data['expires_at']) : null);
            if ($created) {
                $id = DB::table('ai_credit_grants')->where('user_id', $data['user_id'])
                    ->where('source', 'admin_adjustment')
                    ->where('source_ref', $data['external_reference'])->value('id');
                $access->audit($request->user()->id, 'credits.grant', 'ai_credit_grants', $id,
                    null, ['credits' => $data['credits'], 'user_id' => $data['user_id']], $data['reason']);
            }
            return $created;
        });
        return response()->json(['created' => $created], $created ? 201 : 200);
    }

    public function reconcile(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.view_reports');
        // READ ONLY. Do not auto-correct financial history by overwriting projections.
        $wallets = DB::table('ai_credit_wallets as w')
            ->leftJoinSub(DB::table('ai_credit_grants')->select('user_id')
                ->selectRaw('SUM(available) AS a, SUM(reserved) AS r, SUM(consumed) AS c')
                ->groupBy('user_id'), 'g', 'g.user_id', '=', 'w.user_id')
            ->where(fn ($q) => $q->whereRaw('w.available <> COALESCE(g.a, 0)')
                ->orWhereRaw('w.reserved <> COALESCE(g.r, 0)')
                ->orWhereRaw('w.spent_lifetime <> COALESCE(g.c, 0)'))
            ->limit(100)->get(['w.user_id', 'w.available', 'w.reserved', 'w.spent_lifetime',
                'g.a as grants_available', 'g.r as grants_reserved', 'g.c as grants_consumed']);
        $bucketMismatches = DB::table('ai_chat_usage_buckets as b')->leftJoinSub(
            DB::table('ai_chat_usage_events')->select('bucket_id')
                ->selectRaw('SUM(completed_delta) AS completed, SUM(reserved_delta) AS reserved')
                ->groupBy('bucket_id'), 'e', 'e.bucket_id', '=', 'b.id')
            ->where(fn ($q) => $q->whereRaw('b.completed_count <> COALESCE(e.completed, 0)')
                ->orWhereRaw('b.reserved_count <> COALESCE(e.reserved, 0)'))
            ->limit(100)->get(['b.id', 'b.user_id']);
        $ledgerMismatches = DB::table('ai_credit_wallets as w')->leftJoinSub(
            DB::table('ai_credit_ledger')->select('user_id')
                ->selectRaw('SUM(available_delta) AS a, SUM(reserved_delta) AS r, SUM(consumed_delta) AS c')
                ->groupBy('user_id'), 'e', 'e.user_id', '=', 'w.user_id')
            ->where(fn ($q) => $q->whereRaw('w.available <> COALESCE(e.a, 0)')
                ->orWhereRaw('w.reserved <> COALESCE(e.r, 0)')
                ->orWhereRaw('w.spent_lifetime <> COALESCE(e.c, 0)'))
            ->limit(100)->get(['w.user_id']);
        return response()->json(['wallet_mismatches' => $wallets,
            'ledger_mismatches' => $ledgerMismatches,
            'chat_bucket_mismatches' => $bucketMismatches, 'auto_repaired' => false]);
    }

    public function resolveUnknown(Request $request, string $uuid, AiAdminAccess $access,
        AiExecutionService $executor): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_credits');
        $data = $request->validate(['reason' => ['required', 'string', 'min:15', 'max:500'],
            'upstream_reconciled' => ['required', 'accepted']]);
        $record = DB::table('ai_requests')->where('request_uuid', $uuid)
            ->where('status', 'provider_status_unknown')->first();
        abort_unless($record, 404);
        $executor->fail($record->id, 'RECONCILED_NO_DELIVERABLE');
        $access->audit($request->user()->id, 'request.refund_unknown', 'ai_requests',
            $record->id, ['status' => 'provider_status_unknown'], ['status' => 'failed'], $data['reason']);
        return response()->json(['status' => 'failed', 'credits_released' => true]);
    }
}
