<?php

namespace Tests\Feature\Billing;

use App\Domain\Billing\Payments\Contracts\PaymentGateway;
use App\Domain\Billing\Payments\DTO\CheckoutSession;
use App\Domain\Billing\Payments\DTO\VerifiedPayment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class FakeMerchantGateway implements PaymentGateway
{
    public ?VerifiedPayment $receipt = null;
    public int $starts = 0;

    public function __construct(private readonly string $merchant = 'bkash') {}

    public function provider(): string { return $this->merchant; }

    public function start(object $order): CheckoutSession
    {
        $this->starts++;
        return new CheckoutSession('https://merchant-test.example/checkout/'.$order->uuid, 'session-'.$order->uuid);
    }

    public function verify(string $payload, array $headers): VerifiedPayment
    {
        if ($this->receipt === null) {
            throw new \App\Domain\Billing\Payments\PaymentFailure('UNVERIFIED_PAYMENT', 403);
        }
        return $this->receipt;
    }
}

final class CentralPaymentTest extends TestCase
{
    use RefreshDatabase;

    private FakeMerchantGateway $gateway;
    private User $member;
    private int $price;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('pm-circle.temporary_paid_access_enabled', false);
        config()->set('pm-circle.self_service_complimentary_access_enabled', false);
        config()->set('payments.enabled', true);
        config()->set('payments.provider', 'bkash');
        config()->set('payments.redirect_hosts', ['merchant-test.example']);
        $this->gateway = new FakeMerchantGateway;
        $this->app->instance('payments.gateway.bkash', $this->gateway);
        $this->member = User::factory()->create(['onboarding_step' => 3]);
        $plan = DB::table('plans')->insertGetId([
            'code' => 'plus', 'name' => 'Plus', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->price = DB::table('plan_prices')->insertGetId([
            'plan_id' => $plan, 'months' => 1, 'amount_minor' => 39900,
            'currency' => 'BDT', 'version' => 1, 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function begin(?string $key = null, ?int $price = null): array
    {
        return $this->actingAs($this->member)->postJson(route('billing.membership.checkout'), [
            'plan_price_id' => $price ?? $this->price,
            'client_request_key' => $key ?? (string) Str::uuid(),
        ])->assertStatus(202)->json();
    }

    private function receipt(string $uuid, string $state = 'paid', int $amount = 39900,
        string $transaction = 'TXN001', string $event = 'EVENT001'): void
    {
        $this->gateway->receipt = new VerifiedPayment('bkash', $event, $uuid,
            $transaction, $amount, 'BDT', $state);
    }

    private function callback(int $status = 200): void
    {
        $this->postJson('/webhooks/payments/bkash', ['event' => 'not-a-trustworthy-payment-proof'])
            ->assertStatus($status);
    }

    public function test_checkout_cannot_create_orders_without_active_approved_gateway(): void
    {
        config()->set('payments.enabled', false);
        $this->actingAs($this->member)->postJson(route('billing.membership.checkout'), [
            'plan_price_id' => $this->price, 'client_request_key' => (string) Str::uuid(),
        ])->assertStatus(503)->assertJsonPath('code', 'PAYMENT_GATEWAY_NOT_CONFIGURED');
        $this->assertDatabaseCount('payment_orders', 0);

        config()->set('payments.enabled', true);
        config()->set('payments.provider', 'nagad');
        $this->actingAs($this->member)->postJson(route('billing.membership.checkout'), [
            'plan_price_id' => $this->price, 'client_request_key' => (string) Str::uuid(),
        ])->assertStatus(503);
        $this->assertDatabaseCount('payment_orders', 0);
    }

    public function test_retries_reuse_one_order_and_never_grant_before_provider_confirmation(): void
    {
        $key = (string) Str::uuid();
        $first = $this->begin($key);
        $second = $this->begin($key);
        $this->assertSame($first['order_id'], $second['order_id']);
        $this->assertSame(1, $this->gateway->starts);
        $this->assertSame('pending', $first['status']);
        $this->assertSame(39900, $first['amount_minor']);
        $this->assertSame($first['checkout_url'], $second['checkout_url']);
        $this->assertDatabaseCount('subscriptions', 0);
        $this->assertDatabaseCount('payment_orders', 1);
        $this->assertDatabaseCount('payment_events', 0);
        $this->assertSame('free', app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($this->member));
    }

    public function test_paid_provider_receipt_creates_exactly_one_subscription(): void
    {
        $order = $this->begin();
        $this->receipt($order['order_id']);
        $this->callback();
        $this->callback();
        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('payment_events', 1);
        $this->assertDatabaseHas('payment_orders', ['uuid' => $order['order_id'], 'status' => 'paid']);
        $this->assertSame('plus', app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($this->member));
        $this->actingAs($this->member)->getJson(route('billing.orders.show', $order['order_id']))
            ->assertOk()->assertJsonPath('status', 'paid')->assertJsonMissingPath('checkout_url');
    }

    public function test_wrong_amount_or_unverified_receipt_never_grants_entitlement(): void
    {
        $order = $this->begin();
        $this->receipt($order['order_id'], amount: 1);
        $this->callback(403);
        $this->assertDatabaseCount('subscriptions', 0);
        $this->assertDatabaseCount('payment_events', 0);
        $this->gateway->receipt = null;
        $this->callback(403);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_key_conflicts_and_cross_user_order_access_are_denied(): void
    {
        $key = (string) Str::uuid();
        $order = $this->begin($key);
        $otherPrice = DB::table('plan_prices')->insertGetId([
            'plan_id' => DB::table('plans')->value('id'), 'months' => 3,
            'amount_minor' => 105000, 'currency' => 'BDT', 'version' => 1,
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->member)->postJson(route('billing.membership.checkout'), [
            'plan_price_id' => $otherPrice, 'client_request_key' => $key,
        ])->assertStatus(409)->assertJsonPath('code', 'IDEMPOTENCY_KEY_REUSED');
        $stranger = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($stranger)->getJson(route('billing.orders.show', $order['order_id']))
            ->assertNotFound();
        $this->assertDatabaseCount('payment_orders', 1);
    }

    public function test_refund_revokes_subscription_and_its_unspent_monthly_ai_credits(): void
    {
        $order = $this->begin();
        $this->receipt($order['order_id']);
        $this->callback();
        $subscriptionId = (int) DB::table('subscriptions')->value('id');
        $created = app(\App\Domain\AI\Services\AiCreditService::class)->grant(
            $this->member->id, 'subscription_cycle',
            "subscription:{$subscriptionId}:cycle:2026-11-19T00:00:00Z", 20, now()->addMonth());
        $this->assertTrue($created);
        $this->receipt($order['order_id'], 'refunded', event: 'EVENT002');
        $this->callback();
        $this->assertDatabaseHas('subscriptions', ['id' => $subscriptionId, 'status' => 'revoked']);
        $this->assertDatabaseHas('payment_orders', ['uuid' => $order['order_id'], 'status' => 'refunded']);
        $this->assertSame(0, (int) DB::table('ai_credit_wallets')
            ->where('user_id', $this->member->id)->value('available'));
        $this->assertSame('free', app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($this->member));
        $this->callback();
        $this->assertDatabaseCount('payment_events', 2);
    }

    public function test_member_cannot_manipulate_price_or_approve_payment_through_api(): void
    {
        $this->actingAs($this->member)->postJson(route('billing.membership.checkout'), [
            'plan_price_id' => $this->price, 'client_request_key' => (string) Str::uuid(),
            'amount_minor' => 1, 'status' => 'paid', 'provider' => 'fake',
        ])->assertStatus(202)->assertJsonPath('amount_minor', 39900)
            ->assertJsonPath('status', 'pending');
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_ai_credit_purchase_uses_same_payment_event_and_idempotency_pipeline(): void
    {
        DB::table('subscriptions')->insert([
            'user_id' => $this->member->id, 'plan_price_id' => $this->price,
            'status' => 'active', 'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        config()->set('pm-ai.purchases_enabled', true);
        $package = DB::table('ai_credit_packages')->insertGetId([
            'code' => 'test-pack', 'version' => 1, 'title' => 'Test Pack',
            'credits' => 50, 'price_minor' => 2000, 'currency' => 'BDT',
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $key = (string) Str::uuid();
        $first = $this->actingAs($this->member)->postJson(route('billing.ai.checkout'), [
            'package_id' => $package, 'client_request_key' => $key,
        ])->assertStatus(202)->json();
        $this->assertSame('pending', $first['status']);
        $this->receipt($first['order_id'], amount: 2000, transaction: 'TXNAI01', event: 'EVTAI01');
        $this->callback();
        $this->callback();
        $this->assertDatabaseCount('payment_events', 1);
        $this->assertDatabaseCount('ai_credit_grants', 1);
        $this->assertSame(50, (int) DB::table('ai_credit_wallets')
            ->where('user_id', $this->member->id)->value('available'));
        $this->receipt($first['order_id'], 'chargeback', 2000, 'TXNAI01', 'EVTAI02');
        $this->callback();
        $this->assertDatabaseHas('payment_orders', ['uuid' => $first['order_id'], 'status' => 'refunded']);
        $this->assertSame(0, (int) DB::table('ai_credit_wallets')
            ->where('user_id', $this->member->id)->value('available'));
    }

    public function test_already_paid_transaction_cannot_settle_another_order(): void
    {
        $first = $this->begin();
        $this->receipt($first['order_id']);
        $this->callback();
        $second = $this->begin();
        $this->receipt($second['order_id'], event: 'EVENT002');
        $this->callback(409);
        $this->assertDatabaseCount('subscriptions', 1);
        $this->assertDatabaseCount('payment_events', 1);
    }
    public function test_delayed_ai_payment_without_active_subscription_is_held_for_refund_review(): void
    {
        DB::table('subscriptions')->insert([
            'user_id' => $this->member->id, 'plan_price_id' => $this->price,
            'status' => 'active', 'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        config()->set('pm-ai.purchases_enabled', true);
        $package = DB::table('ai_credit_packages')->insertGetId([
            'code' => 'late-pack', 'version' => 1, 'title' => 'Late Pack',
            'credits' => 50, 'price_minor' => 2000, 'currency' => 'BDT',
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $order = $this->actingAs($this->member)->postJson(route('billing.ai.checkout'), [
            'package_id' => $package, 'client_request_key' => (string) Str::uuid(),
        ])->assertStatus(202)->json();
        DB::table('subscriptions')->where('user_id', $this->member->id)->update([
            'ends_at' => now()->subMinute(),
        ]);
        $this->receipt($order['order_id'], amount: 2000, transaction: 'TXNDELAY', event: 'EVTDELAY');
        $this->callback();
        $this->assertDatabaseHas('payment_orders', [
            'uuid' => $order['order_id'], 'status' => 'fulfillment_review',
        ]);
        $this->assertDatabaseCount('ai_credit_grants', 0);
        $this->receipt($order['order_id'], 'refunded', 2000, 'TXNDELAY', 'EVTREFUND');
        $this->callback();
        $this->assertDatabaseHas('payment_orders', [
            'uuid' => $order['order_id'], 'status' => 'refunded',
        ]);
    }

    public function test_verified_refunds_remain_processable_after_switching_checkout_provider_off(): void
    {
        $order = $this->begin();
        $this->receipt($order['order_id']);
        $this->callback();
        // The old gateway adapter remains available to independently verify previous transactions.
        config()->set('payments.provider', 'nagad');
        config()->set('payments.enabled', false);
        $this->receipt($order['order_id'], 'chargeback', event: 'EVENTREFUND');
        $this->callback();
        $this->assertDatabaseHas('payment_orders', [
            'uuid' => $order['order_id'], 'status' => 'refunded',
        ]);
    }

    public function test_ai_refills_accept_only_configured_bdt_methods_and_bind_retry_to_method(): void
    {
        DB::table('subscriptions')->insert([
            'user_id' => $this->member->id, 'plan_price_id' => $this->price,
            'status' => 'active', 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        config()->set('pm-ai.purchases_enabled', true);
        config()->set('payments.ai_refill_providers', ['bkash', 'sslcommerz', 'nagad']);
        $ssl = new FakeMerchantGateway('sslcommerz');
        $this->app->instance('payments.gateway.sslcommerz', $ssl);
        $this->app->instance('payments.gateway.nagad', new FakeMerchantGateway('nagad'));
        $package = DB::table('ai_credit_packages')->insertGetId([
            'code' => 'refill', 'version' => 1, 'title' => 'Refill', 'credits' => 25000,
            'price_minor' => 40000, 'currency' => 'BDT', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->member)->getJson(route('billing.ai.packages'))
            ->assertOk()->assertJsonPath('providers', ['bkash', 'sslcommerz'])
            ->assertJsonPath('packages.0.id', $package);
        $key = (string) Str::uuid();
        $payload = ['package_id' => $package, 'client_request_key' => $key, 'provider' => 'sslcommerz'];
        $first = $this->postJson(route('billing.ai.checkout'), $payload)
            ->assertStatus(202)->assertJsonPath('amount_minor', 40000)->json();
        $this->postJson(route('billing.ai.checkout'), $payload)
            ->assertStatus(202)->assertJsonPath('order_id', $first['order_id']);
        $this->assertSame(1, $ssl->starts);
        $this->assertSame(0, $this->gateway->starts);
        $this->assertDatabaseHas('payment_orders', ['uuid' => $first['order_id'], 'provider' => 'sslcommerz']);
        $this->postJson(route('billing.ai.checkout'), array_replace($payload, ['provider' => 'bkash']))
            ->assertStatus(409);
        $this->postJson(route('billing.ai.checkout'), array_replace($payload, ['provider' => 'nagad']))
            ->assertUnprocessable();
        $this->assertDatabaseCount('payment_orders', 1);
        $ssl->receipt = new VerifiedPayment('sslcommerz', 'ssl-event-1', $first['order_id'],
            'ssl-txn-1', 40000, 'BDT', 'paid');
        $this->postJson('/webhooks/payments/sslcommerz', ['event' => 'verified-by-test-adapter'])->assertOk();
        $this->postJson('/webhooks/payments/sslcommerz', ['event' => 'verified-by-test-adapter'])->assertOk();
        $this->assertDatabaseCount('ai_credit_grants', 1);
        $this->assertSame(25000, (int) DB::table('ai_credit_wallets')->where('user_id', $this->member->id)->value('available'));
    }

    public function test_ai_catalog_can_be_prepared_without_gateway_but_cannot_accept_payment(): void
    {
        config()->set('pm-ai.purchases_enabled', false);
        $package = DB::table('ai_credit_packages')->insertGetId([
            'code' => 'prepared', 'version' => 1, 'title' => 'Prepared', 'credits' => 10000,
            'price_minor' => 20000, 'currency' => 'BDT', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->member)->getJson(route('billing.ai.packages'))
            ->assertOk()->assertJsonPath('enabled', false)->assertJsonPath('providers', [])
            ->assertJsonPath('packages.0.id', $package);
        $this->postJson(route('billing.ai.checkout'), [
            'package_id' => $package, 'client_request_key' => (string) Str::uuid(), 'provider' => 'bkash',
        ])->assertStatus(503);
        $this->assertDatabaseCount('payment_orders', 0);
    }

}
