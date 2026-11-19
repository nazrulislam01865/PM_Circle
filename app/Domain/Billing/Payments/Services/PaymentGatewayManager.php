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
        if (! in_array($provider, ['bkash', 'nagad'], true)
            || ($forCheckout && (! config('payments.enabled') || $provider !== $selected))) {
            throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
        }

        $gateway = $this->container->make('payments.gateway.'.$provider);
        if (! $gateway instanceof PaymentGateway || $gateway->provider() !== $provider) {
            throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
        }

        return $gateway;
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
