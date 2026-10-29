<?php

return [
    'terms_version' => env('PMC_TERMS_VERSION', '2026-10-29'),
    'privacy_version' => env('PMC_PRIVACY_VERSION', '2026-10-29'),
    'legal_documents_published' => (bool) env('PMC_LEGAL_DOCUMENTS_PUBLISHED', false),
    'payments_enabled' => (bool) env('PMC_PAYMENTS_ENABLED', false),
    // Temporary switch. Enable before production launch.
    'email_verification_required' => (bool) env('PMC_EMAIL_VERIFICATION_REQUIRED', false),
    'demo_content_enabled' => (bool) env('PMC_DEMO_CONTENT_ENABLED', true),
    // Local/testing grants. Never creates paid subscription or payment records.
    'temporary_paid_access_enabled' => (bool) env('PMC_TEMPORARY_PAID_ACCESS_ENABLED', true),
    // Explicit owner-controlled opt-in for complimentary membership access,
    // including production. Disabled by default; do not confuse with checkout.
    'self_service_complimentary_access_enabled' => (bool) env('PMC_SELF_SERVICE_COMPLIMENTARY_ACCESS_ENABLED', false),
];
