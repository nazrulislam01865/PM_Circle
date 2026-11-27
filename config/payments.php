<?php

return [
    // Payments remain OFF until a merchant account, production adapter and callback verification are approved.
    'enabled' => (bool) env('PM_PAYMENTS_ENABLED', false),
    'provider' => strtolower((string) env('PM_PAYMENT_PROVIDER', '')),
    // Optional independent allowlist for AI credit checkout. Empty uses the default merchant if supported.
    'ai_refill_providers' => array_values(array_filter(array_map(fn (string $provider): string => strtolower(trim($provider)), explode(',', (string) env('PM_AI_REFILL_PROVIDERS', ''))))),
    // Populate with the exact merchant-approved hosted-checkout domains; wildcards are not accepted.
    'redirect_hosts' => array_values(array_filter(array_map(fn (string $host): string => strtolower(trim($host)), explode(',', (string) env('PM_PAYMENT_REDIRECT_HOSTS', ''))))),
    'order_ttl_minutes' => min(120, max(5, (int) env('PM_PAYMENT_ORDER_TTL_MINUTES', 30))),
];
