<?php

namespace App\Providers;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Billing\AiPaymentGateway;
use App\Domain\AI\Billing\UnconfiguredAiPaymentGateway;
use App\Domain\AI\Providers\OpenAiResponsesProvider;
use Illuminate\Support\ServiceProvider;

final class AiServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(AiProvider::class, OpenAiResponsesProvider::class);
        $this->app->bind(AiPaymentGateway::class, UnconfiguredAiPaymentGateway::class);
    }
}
