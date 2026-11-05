<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/** Single server-side signup password contract for both registration paths. */
final class SignupPasswordRules
{
    public static function rule(): Password
    {
        return Password::min(8)->mixedCase()->numbers()->symbols();
    }
}
