<?php

namespace App\Domain\AI\Billing;

interface AiPaymentGateway
{
    /** Starts a remote checkout; provider implementation must use server-created order amount/currency. */
    public function createCheckout(object $order): string;

    /** Must cryptographically authenticate the callback AND independently verify payment with provider. */
    public function verifiedReceipt(string $provider, string $payload, array $headers): VerifiedAiPayment;
}
