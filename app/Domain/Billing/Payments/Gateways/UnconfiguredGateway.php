<?php

namespace App\Domain\Billing\Payments\Gateways;

use App\Domain\Billing\Payments\Contracts\PaymentGateway;
use App\Domain\Billing\Payments\DTO\CheckoutSession;
use App\Domain\Billing\Payments\DTO\VerifiedPayment;
use App\Domain\Billing\Payments\PaymentFailure;

/** No mocked approvals, test-only public bypass or trusted client-side success flags. */
final class UnconfiguredGateway implements PaymentGateway
{
    public function provider(): string { return 'unconfigured'; }

    public function start(object $order): CheckoutSession
    {
        throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
    }

    public function verify(string $payload, array $headers): VerifiedPayment
    {
        throw new PaymentFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
    }
}
