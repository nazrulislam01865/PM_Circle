<?php

return [
    // Disabled until the administrator explicitly provisions API access and allowances.
    // This is independent of payment and refill integration, which is not implemented.
    'ai_help_enabled' => (bool) env('PMP_AI_HELP_ENABLED', false),
    'ai_model' => env('PMP_AI_MODEL', 'gpt-4o-mini'),
    'ai_api_key' => env('OPENAI_API_KEY'),
    'ai_timeout_seconds' => (int) env('PMP_AI_TIMEOUT_SECONDS', 20),
    'initial_tokens' => [
        'plus' => max(0, (int) env('PMP_AI_PLUS_INITIAL_TOKENS', 0)),
        'pro' => max(0, (int) env('PMP_AI_PRO_INITIAL_TOKENS', 0)),
    ],
];
