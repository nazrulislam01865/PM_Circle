<?php

namespace App\Support;

final class SignupVerificationMode
{
    public const FIXED_CODE = '123456';

    /** Development shortcuts are never active outside local/test environments. */
    public static function current(): string
    {
        if (! app()->environment(['local', 'testing'])) {
            return 'email';
        }

        $mode = config('pm-circle.signup_verification_mode', 'email');

        return in_array($mode, ['email', 'fixed', 'off'], true) ? $mode : 'email';
    }
}
