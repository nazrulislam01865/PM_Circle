<?php

namespace App\Http\Controllers\Billing;

use App\Domain\AI\Billing\AiCheckoutService;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AiCreditCheckoutController extends Controller
{
    public function packages(Request $request): JsonResponse
    {
        return response()->json(['enabled' => (bool) config('pm-ai.purchases_enabled'),
            'packages' => config('pm-ai.purchases_enabled')
                ? DB::table('ai_credit_packages')->where('active', true)
                    ->orderBy('price_minor')->get(['id', 'code', 'title', 'credits',
                        'price_minor', 'currency', 'expires_after_days']) : []]);
    }

    public function checkout(Request $request, AiCheckoutService $service): JsonResponse
    {
        $data = $request->validate([
            'package_id' => ['required', 'integer', 'min:1'],
            'client_request_key' => ['required', 'uuid'],
        ]);
        try {
            return response()->json($service->checkout($request->user(),
                $data['package_id'], $data['client_request_key']), 202);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function order(Request $request, string $uuid): JsonResponse
    {
        $row = DB::table('ai_credit_orders')->where('order_uuid', $uuid)
            ->where('user_id', $request->user()->id)->first();
        abort_unless($row, 404);
        return response()->json(['order_id' => $row->order_uuid, 'status' => $row->status,
            'amount_minor' => $row->amount_minor, 'currency' => $row->currency,
            'package' => json_decode($row->package_snapshot_json, true),
            'verified_at' => $row->verified_at]);
    }

    public function webhook(Request $request, string $provider, AiCheckoutService $service): JsonResponse
    {
        try {
            $service->acceptWebhook($provider, $request->getContent(), $request->headers->all());
            return response()->json(['received' => true]);
        } catch (AiFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }
}
