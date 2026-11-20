<?php

return [
    // Rollout switches are deliberately OFF until prices, entitlements, quality and operational checks are approved.
    'enabled' => (bool) env('PM_AI_ENABLED', false),
    'purchases_enabled' => (bool) env('PM_AI_PURCHASES_ENABLED', false),
    'editorial_enabled' => (bool) env('PM_AI_EDITORIAL_ENABLED', false),
    'subscription_grants_enabled' => (bool) env('PM_AI_SUBSCRIPTION_GRANTS_ENABLED', false),
    'api_key' => env('OPENAI_API_KEY'),
    // Dedicated restricted key for Daily Challenge only. Never expose it through an admin response.
    'daily_challenge_api_key' => env('OPENAI_DAILY_CHALLENGE_API_KEY'),
    // Post Check Omni moderation key; also used ONLY for Daily Challenge input/output moderation.
    // Daily Challenge generation and evaluation continue using daily_challenge_api_key.
    'post_check_api_key' => env('OPENAI_POST_CHECK_API_KEY'),
    // Opt in to the Moderations API without changing existing Responses-based installations.
    'post_check_provider' => env('PM_AI_POST_CHECK_PROVIDER', 'responses'),
    'post_check_enabled' => (bool) env('PM_AI_POST_CHECK_ENABLED', false),
    // Optional multimodal preflight: requires Moderations -> Write on the dedicated post key.
    'post_check_external_moderation' => (bool) env('PM_AI_POST_CHECK_EXTERNAL_MODERATION', false),
    'post_check_daily_budget_usd' => (float) env('PM_AI_POST_CHECK_DAILY_BUDGET_USD', 0),
    'post_check_queue' => env('PM_AI_POST_CHECK_QUEUE', 'ai-editorial'),
    // Resume extraction is an independent opt-in feature. Leave off until the dedicated key/model are approved.
    'resume_extract_enabled' => (bool) env('PM_AI_RESUME_EXTRACT_ENABLED', false),
    'resume_extract_api_key' => env('OPENAI_RESUME_EXTRACT_API_KEY'),
    'resume_extract_model' => env('PM_AI_RESUME_EXTRACT_MODEL'),
    'resume_extract_queue' => env('PM_AI_RESUME_EXTRACT_QUEUE', 'ai-interactive'),
    'resume_extract_daily_limit' => min(20, max(1, (int) env('PM_AI_RESUME_EXTRACT_DAILY_LIMIT', 3))),
    'resume_extract_timeout_seconds' => min(45, max(20, (int) env('PM_AI_RESUME_EXTRACT_TIMEOUT_SECONDS', 45))),
    'resume_extract_max_output_tokens' => min(10000, max(2000, (int) env('PM_AI_RESUME_EXTRACT_MAX_OUTPUT_TOKENS', 6000))),
    'daily_challenge_reasoning_effort' => 'minimal',
    // Local debugging ONLY: permit generated editorial challenges with a Responses-only key.
    // Never skips moderation for member-submitted answers or in deployed environments.
    'daily_challenge_skip_generation_moderation' => (bool) env('PM_AI_DAILY_CHALLENGE_SKIP_GENERATION_MODERATION', false),
    // Exam-only restricted API keys may omit /moderations. All other features retain external moderation.
    'pmp_external_moderation' => (bool) env('PM_AI_PMP_EXTERNAL_MODERATION', false),
    'endpoint' => 'https://api.openai.com/v1',
    'allowed_models' => array_values(array_filter(array_map('trim', explode(',', (string) env('PM_AI_ALLOWED_MODELS', 'gpt-4.1-mini,gpt-4.1,gpt-5-nano'))))),
    'timeout_seconds' => min(45, max(8, (int) env('PM_AI_TIMEOUT_SECONDS', 25))),
    'lease_seconds' => max(120, (int) env('PM_AI_LEASE_SECONDS', 300)),
    'max_requests_per_minute' => max(1, (int) env('PM_AI_MAX_REQUESTS_PER_MINUTE', 6)),
    'hard_chat_daily' => max(1, (int) env('PM_AI_HARD_CHAT_DAILY', 100)),
    'hard_chat_cycle' => max(1, (int) env('PM_AI_HARD_CHAT_CYCLE', 1000)),
    'hard_chat_conversation' => max(1, (int) env('PM_AI_HARD_CHAT_CONVERSATION', 100)),
    'hard_chat_concurrent' => max(1, (int) env('PM_AI_HARD_CHAT_CONCURRENT', 3)),
    'hard_pmp_cycle_tokens' => max(1000, (int) env('PM_AI_HARD_PMP_CYCLE_TOKENS', 250000)),
    'pmp_reasoning_effort' => in_array(env('PM_AI_PMP_REASONING_EFFORT', 'minimal'),
        ['minimal', 'low', 'medium', 'high'], true)
        ? env('PM_AI_PMP_REASONING_EFFORT', 'minimal') : 'minimal',
    'queue' => env('PM_AI_QUEUE', 'ai-interactive'),
    'editorial_queue' => env('PM_AI_EDITORIAL_QUEUE', 'ai-editorial'),
    'daily_editorial_time' => env('PM_AI_DAILY_DRAFT_TIME', '06:00'),
    'allow_demo_credit_grants' => (bool) env('PM_AI_ALLOW_DEMO_CREDIT_GRANTS', false),
    'global_daily_budget_usd' => (float) env('PM_AI_GLOBAL_DAILY_BUDGET_USD', 0),
    'editorial_budget_usd' => (float) env('PM_AI_EDITORIAL_DAILY_BUDGET_USD', 0),
];
