<?php

namespace App\Http\Controllers\Billing;

use App\Domain\Billing\Payments\PaymentFailure;
use App\Domain\Billing\Payments\Services\PaymentCheckoutService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaymentCheckoutController extends Controller
{
    public function membership(Request $request, PaymentCheckoutService $checkout): JsonResponse
    {
        $data = $request->validate([
            'plan_price_id' => ['required', 'integer', 'min:1'],
            'client_request_key' => ['required', 'uuid'],
        ]);
        try {
            return response()->json($checkout->membership($request->user(),
                (int) $data['plan_price_id'], $data['client_request_key']), 202);
        } catch (PaymentFailure $e) {
            return response()->json(['code' => $e->safeCode], $e->httpStatus);
        }
    }

    public function show(Request $request, string $uuid, PaymentCheckoutService $checkout): JsonResponse
    {
        return response()->json($checkout->orderForMember($request->user(), $uuid));
    }
}
