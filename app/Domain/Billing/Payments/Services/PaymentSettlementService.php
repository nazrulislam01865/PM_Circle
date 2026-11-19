<?php

namespace App\Domain\Billing\Payments\Services;

use App\Domain\AI\Services\AiCreditService;
use App\Domain\Billing\Payments\DTO\VerifiedPayment;
use App\Domain\Billing\Payments\PaymentFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class PaymentSettlementService
{
    public function __construct(private readonly PaymentGatewayManager $gateways,
        private readonly AiCreditService $credits, private readonly CurrentMemberPlan $plans) {}

    /** The raw HTTP callback alone is never proof of payment. */
    public function receive(string $provider, string $payload, array $headers): void
    {
        if (strlen($payload) > 65536) {
            throw new PaymentFailure('PAYMENT_PAYLOAD_TOO_LARGE', 413);
        }
        // Disabling new checkouts must not disable independently verified refund/chargeback notifications.
        $receipt = $this->gateways->get($provider, false)->verify($payload, $headers);
        $this->validateReceipt($provider, $receipt);
        DB::transaction(function () use ($receipt, $payload): void {
            $order = DB::table('payment_orders')->where('uuid', $receipt->orderUuid)
                ->lockForUpdate()->first();
            if (! $order || $order->provider !== $receipt->provider
                || (int) $order->amount_minor !== $receipt->amountMinor
                || $order->currency !== $receipt->currency) {
                throw new PaymentFailure('PAYMENT_MISMATCH', 403);
            }
            $existing = DB::table('payment_events')->where('provider', $receipt->provider)
                ->where('event_id', $receipt->eventId)->first();
            if ($existing) {
                if ((int) $existing->payment_order_id !== (int) $order->id
                    || $existing->gateway_transaction_id !== $receipt->transactionId
                    || $existing->state !== $receipt->state
                    || ! hash_equals($existing->payload_sha256, hash('sha256', $payload))) {
                    throw new PaymentFailure('EVENT_REFERENCE_CONFLICT', 409);
                }
                return;
            }
            if ($order->gateway_transaction_id !== null
                && $order->gateway_transaction_id !== $receipt->transactionId) {
                throw new PaymentFailure('PAYMENT_MISMATCH', 403);
            }
            if (DB::table('payment_orders')->where('provider', $receipt->provider)
                ->where('gateway_transaction_id', $receipt->transactionId)
                ->where('id', '<>', $order->id)->exists()) {
                throw new PaymentFailure('PAYMENT_TRANSACTION_REUSED', 409);
            }

            $outcome = 'ignored';
            if ($receipt->state === 'paid' && in_array($order->status, ['pending', 'initiation_unknown'], true)) {
                if ($order->product_type === 'membership') {
                    $subscriptionId = $this->activateMembership($order);
                    DB::table('payment_orders')->where('id', $order->id)->update([
                        'subscription_id' => $subscriptionId,
                    ]);
                } elseif ($order->product_type === 'ai_credit') {
                    // The subscriber must still be eligible when the delayed payment finally clears.
                    $user = User::query()->whereKey($order->user_id)->lockForUpdate()->firstOrFail();
                    $current = $this->plans->details($user);
                    if ($current['source'] !== 'subscription'
                        || ! in_array($current['code'], ['plus', 'pro'], true)) {
                        DB::table('payment_orders')->where('id', $order->id)->update([
                            'gateway_transaction_id' => $receipt->transactionId,
                            'verified_at' => now(), 'status' => 'fulfillment_review',
                            'checkout_url_encrypted' => null, 'updated_at' => now(),
                        ]);
                        $outcome = 'manual_review';
                    } else {
                        $this->grantCredits($order);
                    }
                } else {
                    throw new PaymentFailure('INVALID_PURCHASE', 503);
                }
                if ($outcome !== 'manual_review') {
                    DB::table('payment_orders')->where('id', $order->id)->update([
                        'gateway_transaction_id' => $receipt->transactionId,
                        'verified_at' => now(), 'status' => 'paid',
                        'checkout_url_encrypted' => null, 'updated_at' => now(),
                    ]);
                    $outcome = 'settled';
                }
            } elseif (in_array($receipt->state, ['refunded', 'chargeback'], true)) {
                if ($order->status === 'fulfillment_review'
                    && $order->gateway_transaction_id === $receipt->transactionId) {
                    // No grant was issued; a confirmed provider refund clears the review.
                    DB::table('payment_orders')->where('id', $order->id)->update([
                        'status' => 'refunded', 'reversed_at' => now(), 'updated_at' => now(),
                    ]);
                    $outcome = 'reversed';
                } elseif ($order->status === 'paid' && $order->gateway_transaction_id === $receipt->transactionId) {
                    $reviewRequired = false;
                    if ($order->product_type === 'ai_credit') {
                        $reviewRequired = ! $this->credits->revokePurchased($order->user_id, $order->uuid);
                    } elseif ($order->product_type === 'membership') {
                        if (! $order->subscription_id) {
                            throw new PaymentFailure('SUBSCRIPTION_NOT_FOUND', 503);
                        }
                        $updated = DB::table('subscriptions')->where('id', $order->subscription_id)
                            ->where('user_id', $order->user_id)->update([
                                'status' => 'revoked', 'ends_at' => now(), 'updated_at' => now(),
                            ]);
                        if ($updated !== 1) {
                            throw new PaymentFailure('SUBSCRIPTION_NOT_FOUND', 503);
                        }
                        $reviewRequired = ! $this->credits->revokeSubscriptionCycles(
                            $order->user_id, (int) $order->subscription_id);
                        // Prepaid renewals scheduled after this term may need a revised start date.
                        if (DB::table('subscriptions')->where('user_id', $order->user_id)
                            ->whereIn('status', ['active', 'cancel_at_term_end'])
                            ->where('starts_at', '>', now())->exists()) {
                            $reviewRequired = true;
                        }
                    } else {
                        throw new PaymentFailure('INVALID_PURCHASE', 503);
                    }
                    DB::table('payment_orders')->where('id', $order->id)->update([
                        'status' => $reviewRequired ? 'reversal_review' : 'refunded',
                        'reversed_at' => now(), 'updated_at' => now(),
                    ]);
                    $outcome = $reviewRequired ? 'manual_review' : 'reversed';
                } elseif (! in_array($order->status, ['refunded', 'reversal_review'], true)) {
                    // Out-of-order reversal: do not silently discard a provider event.
                    throw new PaymentFailure('PAYMENT_RECONCILIATION_REQUIRED', 409);
                }
            } elseif ($receipt->state === 'paid' && $order->status !== 'paid'
                && ! in_array($order->status, ['refunded', 'reversal_review', 'fulfillment_review'], true)) {
                throw new PaymentFailure('PAYMENT_RECONCILIATION_REQUIRED', 409);
            }

            DB::table('payment_events')->insert([
                'payment_order_id' => $order->id,
                'provider' => $receipt->provider, 'event_id' => $receipt->eventId,
                'gateway_transaction_id' => $receipt->transactionId,
                'state' => $receipt->state, 'payload_sha256' => hash('sha256', $payload),
                'outcome' => $outcome, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }, 3);
    }

    private function activateMembership(object $order): int
    {
        $snapshot = json_decode($order->product_snapshot, true);
        $months = (int) ($snapshot['months'] ?? 0);
        if (! in_array($snapshot['plan_code'] ?? null, ['plus', 'pro'], true)
            || $months < 1 || $months > 60) {
            throw new PaymentFailure('INVALID_PURCHASE', 503);
        }
        // User-level serialization prevents concurrent renewals from assigning overlapping periods.
        DB::table('users')->where('id', $order->user_id)->lockForUpdate()->first(['id']);
        $lastEnd = DB::table('subscriptions')->where('user_id', $order->user_id)
            ->whereIn('status', ['active', 'cancel_at_term_end'])
            ->where('ends_at', '>', now())->max('ends_at');
        $start = $lastEnd ? Carbon::parse($lastEnd) : now();
        return DB::table('subscriptions')->insertGetId([
            'user_id' => $order->user_id, 'plan_price_id' => $order->product_id,
            'status' => 'active', 'starts_at' => $start,
            'ends_at' => $start->copy()->addMonthsNoOverflow($months),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function grantCredits(object $order): void
    {
        $snapshot = json_decode($order->product_snapshot, true);
        $amount = (int) ($snapshot['credits'] ?? 0);
        $days = $snapshot['expires_after_days'] ?? null;
        if ($amount < 1 || $amount > 1000000
            || ($days !== null && ($days < 1 || $days > 3650))) {
            throw new PaymentFailure('INVALID_PURCHASE', 503);
        }
        $expiry = $days === null ? null : now()->addDays((int) $days);
        if (! $this->credits->grant($order->user_id, 'paid_package', 'order:'.$order->uuid,
            $amount, $expiry)) {
            throw new PaymentFailure('GRANT_REFERENCE_CONFLICT', 409);
        }
    }

    private function validateReceipt(string $provider, VerifiedPayment $receipt): void
    {
        if ($receipt->provider !== $provider || ! in_array($receipt->state, ['paid', 'refunded', 'chargeback'], true)
            || ! preg_match('/^[A-Za-z0-9_-]{1,140}$/D', $receipt->eventId)
            || ! preg_match('/^[A-Za-z0-9_-]{1,140}$/D', $receipt->transactionId)
            || ! (bool) Str::isUuid($receipt->orderUuid)
            || $receipt->amountMinor < 1 || $receipt->currency !== 'BDT') {
            throw new PaymentFailure('UNVERIFIED_PAYMENT', 403);
        }
    }
}
