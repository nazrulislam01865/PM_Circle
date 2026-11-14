<?php

return [
    // A dedicated, monitored mailbox takes priority. When none is set, reuse
    // the existing transactional-mail sender as the reply destination.
    // Set PMC_SUPPORT_EMAIL when the sender is a no-reply or non-inbox address.
    'support_email' => env('PMC_SUPPORT_EMAIL') ?: env('E2A_SENDER_EMAIL') ?: env('MAIL_FROM_ADDRESS'),
    'verification_minutes' => 10,
    'hours_label' => 'Mon–Sat · 10 AM–6 PM (Bangladesh time)',

    // Classic Google reCAPTCHA v2 "I'm not a robot" checkbox keys.
    // Only the site key may be sent to the browser.
    'recaptcha' => [
        'site_key' => env('RECAPTCHA_SITE_KEY'),
        'secret_key' => env('RECAPTCHA_SECRET_KEY'),
    ],
];
