<?php

namespace App\Http\Controllers\AI;

use App\Domain\AI\Services\AiChatQuotaService;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AiWalletController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $wallet = DB::table('ai_credit_wallets')->where('user_id', $userId)->first();
        $grants = DB::table('ai_credit_grants')->where('user_id', $userId)
            ->where(fn ($q) => $q->where('available', '>', 0)->orWhere('reserved', '>', 0))
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')->limit(30)
            ->get(['source', 'available', 'reserved', 'expires_at']);
        return response()->json(['available' => (int) ($wallet?->available ?? 0),
            'reserved' => (int) ($wallet?->reserved ?? 0),
            'spent_lifetime' => (int) ($wallet?->spent_lifetime ?? 0), 'grants' => $grants]);
    }

    public function ledger(Request $request): JsonResponse
    {
        return response()->json(DB::table('ai_credit_ledger')
            ->where('user_id', $request->user()->id)->orderByDesc('id')
            ->select(['kind', 'available_delta', 'reserved_delta', 'consumed_delta', 'created_at'])
            ->simplePaginate(25));
    }

    public function limits(Request $request, AiChatQuotaService $quotas): JsonResponse
    {
        $validated = $request->validate(['feature' => ['required', 'in:pmp,ask_ai'],
            'conversation_id' => ['nullable', 'integer', 'min:1']]);
        try {
            $feature = $validated['feature'] === 'pmp' ? 'pmp_explain' : 'ask_ai';
            $result = $quotas->summary($request->user(), $feature, $validated['conversation_id'] ?? null);
            $result['credits_available'] = (int) (DB::table('ai_credit_wallets')
                ->where('user_id', $request->user()->id)->value('available') ?? 0);
            return response()->json($result);
        } catch (AiFailure $e) {
            return response()->json(['enabled' => false, 'code' => $e->safeCode], $e->httpStatus);
        }
    }
}
