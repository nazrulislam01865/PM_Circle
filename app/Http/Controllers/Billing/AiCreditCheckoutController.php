<?php

namespace App\Http\Controllers\Billing;

use App\Domain\AI\Billing\AiCheckoutService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Payments\PaymentFailure;
use App\Domain\Billing\Payments\Services\PaymentCheckoutService;
use App\Domain\Billing\Payments\Services\PaymentGatewayManager;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AiCreditCheckoutController extends Controller
{
    public function packages(Request $request, PaymentGatewayManager $gateways): JsonResponse
    {
        $enabled = (bool) config('pm-ai.purchases_enabled') && $gateways->ready();
        return response()->json(['enabled' => $enabled,
            'provider' => $enabled ? $gateways->get()->provider() : null,
            'packages' => $enabled
                ? DB::table('ai_credit_packages')->where('active', true)
                    ->where('currency', 'BDT')
                    ->whereBetween('credits', [1, 1000000])
                    ->whereBetween('price_minor', [1, 100000000])
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
        } catch (AiFailure|PaymentFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function order(Request $request, string $uuid, PaymentCheckoutService $checkout): JsonResponse
    {
        $central = DB::table('payment_orders')->where('uuid', $uuid)
            ->where('user_id', $request->user()->id)->where('product_type', 'ai_credit')->exists();
        if ($central) {
            return response()->json($checkout->orderForMember($request->user(), $uuid));
        }
        // Read-only compatibility for orders stored before central billing migration.
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
        } catch (AiFailure|PaymentFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }
}
