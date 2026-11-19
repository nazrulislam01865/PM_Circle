<?php

namespace App\Domain\Billing\Payments\DTO;

/** Constructed by an adapter only after server-to-server confirmation with the merchant provider. */
final readonly class VerifiedPayment
{
    public function __construct(
        public string $provider,
        public string $eventId,
        public string $orderUuid,
        public string $transactionId,
        public int $amountMinor,
        public string $currency,
        public string $state,
    ) {}
}
