<?php

namespace App\Services\Email;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use RuntimeException;

/** Single transactional-email entry point. Keep credentials and provider details on the server. */
final class EmailService
{
    public function send(string $recipient, Mailable $message, ?string $plainText = null): void
    {
        $provider = config('transactional-mail.provider', 'laravel');
        if ($provider === 'laravel') {
            Mail::to($recipient)->send($message);

            return;
        }

        if ($provider !== 'e2a') {
            throw new RuntimeException('Unsupported transactional email provider.');
        }

        $key = config('transactional-mail.e2a.api_key');
        $sender = config('transactional-mail.e2a.sender');
        if (! is_string($key) || $key === '' || ! is_string($sender) || ! filter_var($sender, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('The e2a transactional email provider is not configured.');
        }

        $subject = $message->envelope()->subject ?? $message->subject;
        if (! is_string($subject) || $subject === '') {
            throw new RuntimeException('A subject is required for transactional email.');
        }

        $html = $message->render();
        $text = $plainText ?? trim(html_entity_decode(strip_tags(preg_replace('/<\/?(?:p|div|br|h[1-6]|li)[^>]*>/i', "\n", $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $url = rtrim(config('transactional-mail.e2a.api_url'), '/').'/agents/'.rawurlencode($sender).'/messages';

        // e2a accepts one idempotency key per logical message. Do not auto-retry OTPs
        // after an uncertain transport failure, or treat review holds as delivered.
        try {
            $response = Http::withToken($key)->acceptJson()
                ->withHeaders(['Idempotency-Key' => (string) Str::uuid()])
                ->timeout(config('transactional-mail.e2a.timeout', 10))
                ->post($url, [
                    'to' => [$recipient],
                    'subject' => $subject,
                    'text' => $text,
                    'html' => $html,
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('E2A transactional email transport failed.', [
                'exception_type' => $exception::class,
            ]);

            throw $exception;
        }

        // A 202 response can mean a review hold, not a send. Preserve the
        // original safety check and log only non-sensitive provider metadata.
        $providerStatus = $response->json('status');
        if (! $response->successful() || ! in_array($providerStatus, ['sent', 'accepted'], true)) {
            $errorCode = $response->json('error.code');
            Log::warning('E2A transactional email request not accepted.', [
                'http_status' => $response->status(),
                'provider_status' => is_string($providerStatus) ? $providerStatus : null,
                'error_code' => is_string($errorCode) ? $errorCode : null,
            ]);

            throw new RuntimeException('The email provider did not accept the message for immediate delivery.');
        }
    }
}
