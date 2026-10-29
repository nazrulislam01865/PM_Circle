<?php

return [
    // PM Circle passwords must always use bcrypt; do not switch via environment.
    'driver' => 'bcrypt',
    'rehash_on_login' => true,
    'bcrypt' => [
        'rounds' => (int) env('BCRYPT_ROUNDS', 12),
        'verify' => true,
        'limit' => null,
    ],
];
