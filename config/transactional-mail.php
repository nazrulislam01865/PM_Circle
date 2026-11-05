<?php

return [
    // Select e2a for the hosted HTTP API, or laravel for the existing Laravel mailer.
    'provider' => env('PM_MAIL_PROVIDER', 'laravel'),
    'e2a' => [
        'api_url' => 'https://api.e2a.dev/v1',
        'api_key' => env('E2A_API_KEY'),
        // A sending identity created and enabled in the e2a dashboard.
        'sender' => env('E2A_SENDER_EMAIL'),
        'timeout' => 10,
    ],
];
