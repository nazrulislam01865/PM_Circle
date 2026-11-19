<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_orders', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->uuid('idempotency_key');
            $table->string('product_type', 24);
            $table->unsignedBigInteger('product_id');
            $table->json('product_snapshot');
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3);
            $table->string('provider', 24);
            $table->string('status', 24)->default('pending');
            $table->string('gateway_transaction_id', 140)->nullable();
            $table->string('gateway_session_id', 140)->nullable();
            $table->text('checkout_url_encrypted')->nullable();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->restrictOnDelete();
            $table->timestampTz('expires_at');
            $table->timestampTz('verified_at')->nullable();
            $table->timestampTz('reversed_at')->nullable();
            $table->timestampsTz();
            $table->unique(['user_id', 'idempotency_key']);
            $table->unique(['provider', 'gateway_transaction_id']);
            $table->unique(['provider', 'gateway_session_id']);
            $table->index(['user_id', 'created_at']);
            $table->index(['status', 'expires_at']);
        });

        Schema::create('payment_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('payment_order_id')->constrained('payment_orders')->restrictOnDelete();
            $table->string('provider', 24);
            $table->string('event_id', 140);
            $table->string('gateway_transaction_id', 140);
            $table->string('state', 24);
            $table->string('payload_sha256', 64);
            $table->string('outcome', 32);
            $table->timestampsTz();
            $table->unique(['provider', 'event_id']);
            $table->index(['payment_order_id', 'created_at']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payment_orders ADD CONSTRAINT payment_amount_positive CHECK (amount_minor > 0)");
            DB::statement("ALTER TABLE payment_orders ADD CONSTRAINT payment_currency_bdt CHECK (currency = 'BDT')");
            DB::statement("ALTER TABLE payment_orders ADD CONSTRAINT payment_product_valid CHECK (product_type IN ('membership', 'ai_credit'))");
            DB::statement("ALTER TABLE payment_orders ADD CONSTRAINT payment_status_valid CHECK (status IN ('pending', 'initiation_unknown', 'paid', 'refunded', 'reversal_review', 'fulfillment_review'))");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('payment_orders');
    }
};
