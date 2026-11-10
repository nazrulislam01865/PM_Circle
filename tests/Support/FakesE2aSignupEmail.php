<?php

namespace Tests\Support;

use Illuminate\Support\Facades\Http;

/** Exercise signup OTP verification through the configured E2A delivery path without network calls. */
trait FakesE2aSignupEmail
{
    protected function configureE2aSignupEmail(): void
    {
        config()->set('transactional-mail.provider', 'e2a');
        config()->set('transactional-mail.e2a.api_key', 'signup-test-key');
        config()->set('transactional-mail.e2a.sender', 'noreply@agents.e2a.dev');
    }

    protected function fakeSuccessfulE2aSignupEmail(): void
    {
        $this->configureE2aSignupEmail();
        Http::fake(['api.e2a.dev/*' => Http::response(['status' => 'accepted'], 202)]);
    }

    protected function sentSignupCode(string $email): string
    {
        $code = '';

        Http::assertSent(function ($request) use ($email, &$code): bool {
            if ($request->url() !== 'https://api.e2a.dev/v1/agents/noreply%40agents.e2a.dev/messages'
                || $request['to'] !== [$email]
                || $request['subject'] !== 'Your PM Circle verification code'
                || preg_match('/\b([0-9]{6})\b/', (string) $request['text'], $matches) !== 1) {
                return false;
            }

            $code = $matches[1];

            return true;
        });

        Http::assertSentCount(1);

        return $code;
    }
}
