<?php

namespace App\Domain\AI\Billing;

use App\Domain\AI\Support\AiFailure;

/** Fail closed. There is no approved PM Circle payment provider in the supplied specification. */
final class UnconfiguredAiPaymentGateway implements AiPaymentGateway
{
    public function createCheckout(object $order): string
    {
        throw new AiFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
    }

    public function verifiedReceipt(string $provider, string $payload, array $headers): VerifiedAiPayment
    {
        throw new AiFailure('PAYMENT_GATEWAY_NOT_CONFIGURED', 503);
    }
}
