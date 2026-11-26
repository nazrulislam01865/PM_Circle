<?php

namespace App\Http\Controllers\AI;

use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Services\AiGateway;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use App\Http\Requests\AI\StartAiRequestRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

final class AiRequestController extends Controller
{
    public function store(StartAiRequestRequest $request, AiGateway $gateway): JsonResponse
    {
        try {
            $receipt = $gateway->submit($request->user(), $request->validated());
            return response()->json($receipt, in_array($receipt['status'], ['completed', 'failed'], true) ? 200 : 202);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode, 'message' => $this->safeMessage($e->safeCode)], $e->httpStatus);
        }
    }

    public function show(Request $request, string $uuid): JsonResponse
    {
        $row = DB::table('ai_requests')->where('request_uuid', $uuid)
            ->where('user_id', $request->user()->id)->first();
        abort_unless($row, 404);
        $response = ['request_id' => $row->request_uuid, 'status' => $row->status,
            'feature' => $row->feature_code, 'credits_reserved' => (int) $row->estimated_hold,
            'credits_charged' => (int) $row->final_charge];
        if ($row->status === 'completed') {
            $response['usage'] = [
                'input_tokens' => (int) $row->input_tokens, 'cached_input_tokens' => (int) $row->cached_tokens,
                'output_tokens' => (int) $row->output_tokens,
            ];
            $response['result'] = json_decode(Crypt::decryptString($row->result_encrypted), true);
        } elseif (in_array($row->status, ['failed', 'cancelled', 'provider_status_unknown'], true)) {
            $response['code'] = $row->error_code ?: 'RECONCILING';
        }
        return response()->json($response)->header('Cache-Control', 'private, no-store');
    }

    public function features(Request $request, AiFeatureCatalog $catalog,
        \App\Domain\Billing\Queries\CurrentMemberPlan $plans): JsonResponse
    {
        if (! config('pm-ai.enabled')) {
            return response()->json(['enabled' => false, 'features' => []]);
        }
        $features = DB::table('ai_features')->where('enabled', true)
            ->whereNotIn('code', ['scenario_generate', 'trend_draft', 'daily_challenge_review'])
            ->get(['code', 'min_plan', 'credit_tariff', 'tariff_version', 'max_input_chars']);
        $plan = $plans->code($request->user());
        $features = $features->filter(fn ($f) => \App\Domain\Billing\Queries\MemberFeatureAccess::allowsAi($plan, $f->code, $f->min_plan))->values();
        return response()->json(['enabled' => true, 'features' => $features]);
    }

    public function history(Request $request): JsonResponse
    {
        $rows = DB::table('ai_requests')->where('user_id', $request->user()->id)
            ->orderByDesc('id')->select(['request_uuid', 'feature_code', 'status',
                'final_charge', 'estimated_hold', 'created_at', 'completed_at'])
            ->simplePaginate(25);
        return response()->json($rows);
    }

    private function safeMessage(string $code): string
    {
        return match ($code) {
            'CHAT_LIMIT_REACHED', 'CONVERSATION_LIMIT_REACHED' => 'Your AI reply limit has been reached.',
            'INSUFFICIENT_CREDITS' => 'Your available AI credit balance is insufficient.',
            'PRICE_CHANGED' => 'The credit price changed. Please review and confirm it again.',
            'NOT_ENTITLED' => 'Your membership does not include this AI feature.',
            'ANSWER_CHANGED' => 'Your saved answer changed. Reopen it before requesting AI review.',
            'ANSWER_REVIEW_NOT_READY' => 'Evaluate your answer before requesting AI review.',
            'CONSENT_REQUIRED' => 'Explicit permission is required before sending content to AI.',
            default => 'This AI operation is unavailable. Please review its eligibility or try again later.',
        };
    }
}
