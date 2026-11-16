<?php

namespace App\Domain\AI\Billing;

final readonly class VerifiedAiPayment
{
    public function __construct(
        public string $provider,
        public string $eventId,
        public string $orderUuid,
        public string $gatewayTransactionId,
        public int $paidMinor,
        public string $currency,
        public string $state,
    ) {}
}
