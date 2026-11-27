<?php

namespace App\Domain\Billing\Payments\Services;

use App\Domain\Billing\Payments\Contracts\PaymentGateway;
use App\Domain\Billing\Payments\PaymentFailure;
use Illuminate\Contracts\Container\Container;

final class PaymentGatewayManager
{
    public function __construct(private readonly Container $container) {}

    /** The selected merchant accepts new orders; prior merchants may still settle/reverse old orders. */
    public function get(?string $provider = null, bool $forCheckout = true): PaymentGateway
    {
        $selected = config('payments.provider');
        $provider ??= $selected;
        if (! in_array($provider, ['bkash', 'nagad', 'sslcommerz'], true)
            || ($forCheckout && (! config('payments.enabled') || $provider !== $selected))) {
            throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
        }

        $gateway = $this->container->make('payments.gateway.'.$provider);
        if (! $gateway instanceof PaymentGateway || $gateway->provider() !== $provider) {
            throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
        }

        return $gateway;
    }

    /** AI refills accept only the two approved Bangladesh providers; membership keeps its existing default. */
    public function aiRefillProviders(): array
    {
        if (! config('payments.enabled') || ! config('pm-ai.purchases_enabled')
            || ! config('payments.redirect_hosts', [])) {
            return [];
        }
        $configured = config('payments.ai_refill_providers', []);
        $configured = $configured ?: [config('payments.provider')];
        $available = [];
        foreach (['bkash', 'sslcommerz'] as $provider) {
            if (! in_array($provider, $configured, true)) {
                continue;
            }
            try {
                $this->get($provider, false);
                $available[] = $provider;
            } catch (PaymentFailure) {
                // An unconfigured adapter must not be advertised as a working checkout.
            }
        }

        return $available;
    }

    public function forAiRefill(?string $provider = null): PaymentGateway
    {
        $available = $this->aiRefillProviders();
        $provider ??= $available[0] ?? null;
        if (! in_array($provider, $available, true)) {
            throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
        }

        return $this->get($provider, false);
    }

    public function ready(): bool
    {
        try {
            $this->get();
            return true;
        } catch (PaymentFailure) {
            return false;
        }
    }
}
