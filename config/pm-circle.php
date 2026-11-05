<?php

return [
    'terms_version' => env('PMC_TERMS_VERSION', '2026-10-29'),
    'privacy_version' => env('PMC_PRIVACY_VERSION', '2026-10-29'),
    'legal_documents_published' => (bool) env('PMC_LEGAL_DOCUMENTS_PUBLISHED', false),
    'payments_enabled' => (bool) env('PMC_PAYMENTS_ENABLED', false),
    // Temporary switch. Enable before production launch.
    'email_verification_required' => (bool) env('PMC_EMAIL_VERIFICATION_REQUIRED', false),
    // email = SMTP code, fixed = local 123456, off = local-only no code.
    // Outside local/testing, SignupVerificationMode always enforces email.
    // Legacy PMC_SIGNUP_EMAIL_CODE_REQUIRED is accepted if the mode is not set.
    'signup_verification_mode' => env(
        'PMC_SIGNUP_VERIFICATION_MODE',
        (bool) env('PMC_SIGNUP_EMAIL_CODE_REQUIRED', true) ? 'email' : 'off',
    ),
    'demo_content_enabled' => (bool) env('PMC_DEMO_CONTENT_ENABLED', true),
    // Optional existing local member to receive illustrative profile entries.
    'demo_profile_email' => env('PMC_DEMO_PROFILE_EMAIL'),
    // Local/testing grants. Never creates paid subscription or payment records.
    'temporary_paid_access_enabled' => (bool) env('PMC_TEMPORARY_PAID_ACCESS_ENABLED', true),
    // Explicit owner-controlled opt-in for complimentary membership access,
    // including production. Disabled by default; do not confuse with checkout.
    'self_service_complimentary_access_enabled' => (bool) env('PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED', false),
];
