<?php

namespace App\Domain\Billing\Payments\Services;

use App\Domain\Billing\Payments\PaymentFailure;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

final class PaymentCheckoutService
{
    public function __construct(private readonly PaymentGatewayManager $gateways,
        private readonly CurrentMemberPlan $plans) {}

    public function membership(User $user, int $priceId, string $clientKey): array
    {
        return $this->create($user, 'membership', $priceId, $clientKey);
    }

    public function aiCredits(User $user, int $packageId, string $clientKey): array
    {
        if (! config('pm-ai.purchases_enabled')) {
            throw new PaymentFailure('PURCHASES_DISABLED', 503);
        }
        $plan = $this->plans->details($user);
        if (! in_array($plan['code'], ['plus', 'pro'], true)
            || $plan['source'] !== 'subscription') {
            throw new PaymentFailure('NOT_ENTITLED', 403);
        }
        return $this->create($user, 'ai_credit', $packageId, $clientKey);
    }

    private function create(User $user, string $type, int $productId, string $clientKey): array
    {
        // Reject payment initiation before inserting any financial row if no provider is approved.
        $gateway = $this->gateways->get();
        $provider = $gateway->provider();

        [$order, $new] = DB::transaction(function () use ($user, $type, $productId, $clientKey, $provider): array {
            // The user lock serializes check-then-insert idempotency on PostgreSQL and SQLite.
            DB::table('users')->where('id', $user->id)->lockForUpdate()->first(['id']);
            $previous = DB::table('payment_orders')->where('user_id', $user->id)
                ->where('idempotency_key', $clientKey)->first();
            if ($previous) {
                if ($previous->product_type !== $type || (int) $previous->product_id !== $productId) {
                    throw new PaymentFailure('IDEMPOTENCY_KEY_REUSED', 409);
                }
                return [$previous, false];
            }
            if ($type === 'membership') {
                $product = DB::table('plan_prices as pp')->join('plans as p', 'pp.plan_id', '=', 'p.id')
                    ->where('pp.id', $productId)->where('pp.active', true)->where('p.active', true)
                    ->whereIn('p.code', ['plus', 'pro'])
                    ->first(['pp.id', 'pp.months', 'pp.amount_minor', 'pp.currency', 'pp.version', 'p.code']);
                if (! $product || $product->months < 1 || $product->months > 60) {
                    throw new PaymentFailure('PLAN_PRICE_UNAVAILABLE', 404);
                }
                $snapshot = ['plan_code' => $product->code, 'months' => (int) $product->months,
                    'price_version' => (int) $product->version];
            } else {
                $product = DB::table('ai_credit_packages')->where('id', $productId)
                    ->where('active', true)->first();
                if (! $product || (int) $product->credits < 1 || (int) $product->credits > 1000000) {
                    throw new PaymentFailure('PACKAGE_NOT_AVAILABLE', 404);
                }
                $snapshot = ['code' => $product->code, 'version' => (int) $product->version,
                    'credits' => (int) $product->credits, 'expires_after_days' => $product->expires_after_days];
            }
            if ($product->currency !== 'BDT') {
                throw new PaymentFailure('PRICE_UNAVAILABLE', 422);
            }
            $amountMinor = (int) ($type === 'membership' ? $product->amount_minor : $product->price_minor);
            if ($amountMinor < 1 || $amountMinor > 100000000) {
                throw new PaymentFailure('PRICE_UNAVAILABLE', 422);
            }
            $id = DB::table('payment_orders')->insertGetId([
                'uuid' => (string) Str::uuid(), 'user_id' => $user->id,
                'idempotency_key' => $clientKey, 'product_type' => $type, 'product_id' => $productId,
                'product_snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR),
                'amount_minor' => $amountMinor, 'currency' => 'BDT',
                'provider' => $provider, 'status' => 'pending',
                'expires_at' => now()->addMinutes(config('payments.order_ttl_minutes')),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            return [DB::table('payment_orders')->find($id), true];
        }, 3);

        if (! $new) {
            return $this->format($order);
        }

        // Never hold a database transaction/row lock across a network call.
        // The future adapter must use order UUID as its remote idempotency reference.
        try {
            $session = $gateway->start($order);
            $this->validateSession($session->checkoutUrl, $session->sessionId);
            DB::table('payment_orders')->where('id', $order->id)->where('status', 'pending')
                ->update(['gateway_session_id' => $session->sessionId,
                    'checkout_url_encrypted' => Crypt::encryptString($session->checkoutUrl),
                    'updated_at' => now()]);
        } catch (Throwable $e) {
            // Provider may have accepted the order even when the response was lost.
            // Never retry automatically or assume it was unpaid; require reconciliation.
            DB::table('payment_orders')->where('id', $order->id)->where('status', 'pending')
                ->update(['status' => 'initiation_unknown', 'updated_at' => now()]);
            Log::warning('Payment initiation requires reconciliation.', [
                'order_uuid' => $order->uuid, 'exception_type' => $e::class,
            ]);
            throw new PaymentFailure('PAYMENT_INITIATION_UNAVAILABLE', 503);
        }

        return $this->format(DB::table('payment_orders')->find($order->id));
    }

    private function validateSession(string $url, string $sessionId): void
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (strlen($sessionId) < 1 || strlen($sessionId) > 140
            || ! filter_var($url, FILTER_VALIDATE_URL)
            || parse_url($url, PHP_URL_SCHEME) !== 'https'
            || ! is_string($host)
            || ! in_array(strtolower($host), config('payments.redirect_hosts'), true)
            || parse_url($url, PHP_URL_USER) !== null || parse_url($url, PHP_URL_PASS) !== null) {
            throw new PaymentFailure('INVALID_GATEWAY_CHECKOUT_URL', 503);
        }
    }

    public function orderForMember(User $user, string $uuid): array
    {
        $order = DB::table('payment_orders')->where('uuid', $uuid)
            ->where('user_id', $user->id)->first();
        abort_unless($order, 404);
        return $this->format($order);
    }

    private function format(object $order): array
    {
        $data = [
            'order_id' => $order->uuid, 'status' => $order->status,
            'product_type' => $order->product_type,
            'amount_minor' => (int) $order->amount_minor, 'currency' => $order->currency,
            'verified_at' => $order->verified_at,
        ];
        if ($order->product_type === 'ai_credit') {
            $data['package'] = json_decode($order->product_snapshot, true);
        }
        if ($order->status === 'pending' && $order->checkout_url_encrypted
            && now()->lt($order->expires_at)) {
            $data['checkout_url'] = Crypt::decryptString($order->checkout_url_encrypted);
        }
        return $data;
    }
}
