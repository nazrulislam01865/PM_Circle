<?php

return [
    // Public websocket endpoint via the existing Nginx TLS reverse proxy.
    'reverb_public_host' => env('REVERB_PUBLIC_HOST', parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
    'reverb_public_port' => (int) env('REVERB_PUBLIC_PORT', 443),
    'reverb_public_secure' => (bool) env('REVERB_PUBLIC_SECURE', true),
];
