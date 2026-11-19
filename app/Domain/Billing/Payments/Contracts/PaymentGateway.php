<?php

namespace App\Domain\Billing\Payments\Contracts;

use App\Domain\Billing\Payments\DTO\CheckoutSession;
use App\Domain\Billing\Payments\DTO\VerifiedPayment;

interface PaymentGateway
{
    public function provider(): string;

    /** The provider must use the immutable, server-created order amount, currency and UUID. */
    public function start(object $order): CheckoutSession;

    /** Authenticate the callback AND independently query the merchant API for final payment state. */
    public function verify(string $payload, array $headers): VerifiedPayment;
}
