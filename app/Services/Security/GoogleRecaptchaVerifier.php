<?php

namespace App\Services\Security;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Verify reCAPTCHA v2 responses with Google; never trust the browser checkbox alone. */
final class GoogleRecaptchaVerifier
{
    public function verify(string $token, string $hostname, ?string $ip = null): bool
    {
        $secret = config('contact.recaptcha.secret_key');

        if (! is_string($secret) || trim($secret) === '') {
            throw new RuntimeException('Google reCAPTCHA is not configured.');
        }

        $payload = [
            'secret' => $secret,
            'response' => $token,
        ];

        if (is_string($ip) && $ip !== '') {
            $payload['remoteip'] = $ip;
        }

        $result = Http::asForm()
            ->acceptJson()
            ->connectTimeout(3)
            ->timeout(7)
            ->post('https://www.google.com/recaptcha/api/siteverify', $payload)
            ->throw();

        $verifiedHostname = $result->json('hostname');

        return $result->json('success') === true
            && is_string($verifiedHostname)
            && strcasecmp(rtrim($verifiedHostname, '.'), rtrim($hostname, '.')) === 0;
    }
}
