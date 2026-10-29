<?php

return [
    'terms_version' => env('PMC_TERMS_VERSION', '2026-10-29'),
    'privacy_version' => env('PMC_PRIVACY_VERSION', '2026-10-29'),
    'legal_documents_published' => (bool) env('PMC_LEGAL_DOCUMENTS_PUBLISHED', false),
    'payments_enabled' => (bool) env('PMC_PAYMENTS_ENABLED', false),
    // Temporary switch. Enable before production launch.
    'email_verification_required' => (bool) env('PMC_EMAIL_VERIFICATION_REQUIRED', false),
    'demo_content_enabled' => (bool) env('PMC_DEMO_CONTENT_ENABLED', true),
    // This is never honored outside local/testing. It must not represent actual payment.
    'temporary_paid_access_enabled' => (bool) env('PMC_TEMPORARY_PAID_ACCESS_ENABLED', true),
];
