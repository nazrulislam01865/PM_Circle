<?php

namespace App\Domain\AI\Billing;

use App\Domain\Billing\Payments\Services\PaymentCheckoutService;
use App\Domain\Billing\Payments\Services\PaymentSettlementService;
use App\Models\User;

/** Compatibility facade: all new AI payments share the central order and verified settlement pipeline. */
final class AiCheckoutService
{
    public function __construct(private readonly PaymentCheckoutService $checkout,
        private readonly PaymentSettlementService $settlement) {}

    public function checkout(User $user, int $packageId, string $clientKey): array
    {
        return $this->checkout->aiCredits($user, $packageId, $clientKey);
    }

    public function acceptWebhook(string $provider, string $payload, array $headers): void
    {
        $this->settlement->receive($provider, $payload, $headers);
    }
}
