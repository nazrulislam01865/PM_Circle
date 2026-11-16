<?php

namespace App\Domain\AI\Billing;

use App\Domain\AI\Services\AiCreditService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class AiCheckoutService
{
    public function __construct(private readonly AiPaymentGateway $gateway,
        private readonly CurrentMemberPlan $plans, private readonly AiCreditService $credits) {}

    public function checkout(User $user, int $packageId, string $clientKey): array
    {
        if (! config('pm-ai.purchases_enabled')) {
            throw new AiFailure('PURCHASES_DISABLED', 503);
        }
        if (! in_array($this->plans->code($user), ['plus', 'pro'], true)
            || $this->plans->details($user)['source'] !== 'subscription') {
            throw new AiFailure('NOT_ENTITLED', 403);
        }
        $order = DB::transaction(function () use ($user, $packageId, $clientKey): object {
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first(['id']);
            $previous = DB::table('ai_credit_orders')->where('user_id', $user->id)
                ->where('idempotency_key', $clientKey)->first();
            if ($previous) {
                return $previous;
            }
            $package = DB::table('ai_credit_packages')->where('id', $packageId)
                ->where('active', true)->first();
            if (! $package || ! $package->credits || ! $package->price_minor) {
                throw new AiFailure('PACKAGE_NOT_AVAILABLE', 404);
            }
            $snapshot = ['code' => $package->code, 'version' => $package->version,
                'credits' => (int) $package->credits, 'expires_after_days' => $package->expires_after_days];
            $id = DB::table('ai_credit_orders')->insertGetId([
                'order_uuid' => (string) Str::uuid(), 'user_id' => $user->id,
                'package_id' => $packageId,
                'package_snapshot_json' => json_encode($snapshot),
                'amount_minor' => $package->price_minor, 'currency' => $package->currency,
                'idempotency_key' => $clientKey, 'status' => 'pending',
                'created_at' => now(), 'updated_at' => now(),
            ]);
            return DB::table('ai_credit_orders')->find($id);
        }, 3);
        if ($order->status !== 'pending') {
            return ['order_id' => $order->order_uuid, 'status' => $order->status];
        }
        return ['order_id' => $order->order_uuid, 'status' => 'pending',
            'checkout_url' => $this->gateway->createCheckout($order)];
    }

    /** Called only by a gateway adapter that has already verified authenticity AND paid state independently. */
    public function acceptWebhook(string $provider, string $payload, array $headers): void
    {
        if (! config('pm-ai.purchases_enabled')) {
            throw new AiFailure('PURCHASES_DISABLED', 503);
        }
        $receipt = $this->gateway->verifiedReceipt($provider, $payload, $headers);
        if ($receipt->provider !== $provider
            || ! in_array($receipt->state, ['paid', 'refunded', 'chargeback'], true)
            || ! $receipt->eventId || ! $receipt->gatewayTransactionId) {
            throw new AiFailure('UNVERIFIED_PAYMENT', 403);
        }
        DB::transaction(function () use ($receipt, $payload): void {
            $inserted = DB::table('ai_gateway_events')->insertOrIgnore([
                'provider' => $receipt->provider, 'provider_event_id' => $receipt->eventId,
                'verified' => true, 'payload_hash' => hash('sha256', $payload),
                'processing_status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            if (! $inserted) {
                return;
            }
            $order = DB::table('ai_credit_orders')->where('order_uuid', $receipt->orderUuid)
                ->lockForUpdate()->first();
            if (! $order || (int) $order->amount_minor !== $receipt->paidMinor
                || $order->currency !== $receipt->currency) {
                throw new AiFailure('PAYMENT_MISMATCH', 403);
            }
            if ($receipt->state === 'paid' && $order->status === 'paid'
                && $order->gateway_ref === $receipt->gatewayTransactionId) {
                DB::table('ai_gateway_events')->where('provider', $receipt->provider)
                    ->where('provider_event_id', $receipt->eventId)->update([
                        'processing_status' => 'duplicate_paid', 'updated_at' => now(),
                    ]);
                return;
            }
            if ($receipt->state !== 'paid') {
                if (! in_array($order->status, ['paid', 'refunded', 'reversal_review'], true)
                    || $order->gateway_ref !== $receipt->gatewayTransactionId) {
                    throw new AiFailure('PAYMENT_MISMATCH', 403);
                }
                if ($order->status === 'paid') {
                    $fullyRevoked = $this->credits->revokePurchased($order->user_id, $order->order_uuid);
                    DB::table('ai_credit_orders')->where('id', $order->id)->update([
                        'status' => $fullyRevoked ? 'refunded' : 'reversal_review', 'updated_at' => now(),
                    ]);
                }
                DB::table('ai_gateway_events')->where('provider', $receipt->provider)
                    ->where('provider_event_id', $receipt->eventId)->update([
                        'processing_status' => 'processed', 'updated_at' => now(),
                    ]);
                return;
            }
            if ($order->status !== 'pending') {
                throw new AiFailure('PAYMENT_MISMATCH', 403);
            }
            $snapshot = json_decode($order->package_snapshot_json, true);
            if (! is_array($snapshot) || ($snapshot['credits'] ?? 0) < 1) {
                throw new AiFailure('INVALID_PURCHASE', 503);
            }
            DB::table('ai_credit_orders')->where('id', $order->id)->update([
                'gateway_ref' => $receipt->gatewayTransactionId,
                'status' => 'paid', 'verified_at' => now(), 'updated_at' => now(),
            ]);
            $expiry = isset($snapshot['expires_after_days']) && $snapshot['expires_after_days']
                ? now()->addDays((int) $snapshot['expires_after_days']) : null;
            $this->credits->grant($order->user_id, 'paid_package',
                'order:'.$order->order_uuid, $snapshot['credits'], $expiry);
            DB::table('ai_gateway_events')->where('provider', $receipt->provider)
                ->where('provider_event_id', $receipt->eventId)->update([
                    'processing_status' => 'processed', 'updated_at' => now(),
                ]);
        }, 3);
    }
}
