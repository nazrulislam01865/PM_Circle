<?php

namespace Tests\Feature\Auth;

use App\Mail\SignupVerificationCode;
use App\Services\Email\EmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Tests\TestCase;

class E2aEmailServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('transactional-mail.provider', 'e2a');
        config()->set('transactional-mail.e2a.api_key', 'test-key-only');
        config()->set('transactional-mail.e2a.sender', 'no-reply@agents.e2a.dev');
    }

    public function test_signup_email_uses_one_server_side_e2a_request_with_a_six_digit_code(): void
    {
        Http::fake(['api.e2a.dev/*' => Http::response(['status' => 'accepted', 'id' => 'msg_test'], 202)]);
        $response = $this->postJson('/api/auth/send-verification-code', ['email' => 'hello@example.com']);
        $response->assertOk()->assertJsonMissing(['development_code', 'code', 'test-key-only']);

        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->url() === 'https://api.e2a.dev/v1/agents/no-reply%40agents.e2a.dev/messages'
            && $request->hasHeader('Authorization', 'Bearer test-key-only')
            && $request->hasHeader('Idempotency-Key')
            && $request['to'] === ['hello@example.com']
            && $request['subject'] === 'Your PM Circle verification code'
            && preg_match('/\b[0-9]{6}\b/', $request['text']) === 1
            && str_contains($request['html'], 'Verify your email'));
    }

    public function test_pending_review_is_not_misrepresented_as_a_delivered_code(): void
    {
        Http::fake(['api.e2a.dev/*' => Http::response(['status' => 'pending_review'], 202)]);
        $this->postJson('/api/auth/send-verification-code', ['email' => 'held@example.com'])
            ->assertStatus(503);
        $this->postJson('/api/auth/verify-code', ['email' => 'held@example.com', 'code' => '123456'])
            ->assertUnprocessable();
    }

    public function test_provider_failure_does_not_issue_a_usable_challenge(): void
    {
        Http::fake(['api.e2a.dev/*' => Http::response(['error' => 'Unavailable'], 503)]);
        $this->postJson('/api/auth/send-verification-code', ['email' => 'failed@example.com'])
            ->assertStatus(503)->assertJsonMissing(['code', 'development_code']);
        $this->postJson('/api/auth/verify-code', ['email' => 'failed@example.com', 'code' => '123456'])
            ->assertUnprocessable();
    }

    public function test_failed_provider_response_logs_only_safe_diagnostic_fields(): void
    {
        Log::spy();
        Http::fake(['api.e2a.dev/*' => Http::response([
            'error' => ['code' => 'external_sending_not_enabled', 'message' => 'Private provider detail'],
        ], 403)]);

        $this->postJson('/api/auth/send-verification-code', ['email' => 'private@example.com'])
            ->assertStatus(503);

        Log::shouldHaveReceived('warning')->with(
            'E2A transactional email request not accepted.',
            Mockery::on(fn ($context) => $context === [
                'http_status' => 403,
                'provider_status' => null,
                'error_code' => 'external_sending_not_enabled',
            ]),
        )->once();
    }

    public function test_laravel_mail_fallback_remains_available_for_future_messages(): void
    {
        config()->set('transactional-mail.provider', 'laravel');
        Mail::fake();
        app(EmailService::class)->send('test@example.com', new SignupVerificationCode('123456'));
        Mail::assertSent(SignupVerificationCode::class, 1);
    }
}
