<?php

return [
    'enabled' => (bool) env('PMC_INTERVIEW_ENABLED', true),
    // Disabled until AI assessment is explicitly approved. The practice flow does not depend on this.
    'ai_feedback_enabled' => false,
    // Countdown is an estimate (two minutes per question); it never deletes answers or forces submission.
    'minutes_per_question' => 2,
    'api_key' => env('OPENAI_API_KEY'),
    'model' => env('PMC_INTERVIEW_MODEL', 'gpt-4.1-mini'),
    // Enter current model-specific USD prices per million tokens when cost tracking is enabled.
    'input_usd_per_million' => (float) env('PMC_INTERVIEW_INPUT_USD_PER_MILLION', 0),
    'output_usd_per_million' => (float) env('PMC_INTERVIEW_OUTPUT_USD_PER_MILLION', 0),
    'timeout' => (int) env('PMC_INTERVIEW_AI_TIMEOUT', 35),
    // Successful evaluations only consume allowance. Failed jobs are never charged.
    'daily_evaluations' => [
        'free' => (int) env('PMC_INTERVIEW_FREE_DAILY_EVALUATIONS', 10),
        'plus' => (int) env('PMC_INTERVIEW_PLUS_DAILY_EVALUATIONS', 30),
        'pro' => (int) env('PMC_INTERVIEW_PRO_DAILY_EVALUATIONS', 50),
    ],
];
