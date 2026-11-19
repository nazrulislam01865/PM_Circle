<?php

namespace App\Domain\Billing\Payments\DTO;

final readonly class CheckoutSession
{
    public function __construct(public string $checkoutUrl, public string $sessionId) {}
}
