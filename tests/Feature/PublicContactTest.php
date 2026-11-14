<?php

namespace Tests\Feature;

use App\Mail\ContactConfirmationLink;
use App\Mail\ContactSupportMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

final class PublicContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('contact.support_email', 'support-test@example.invalid');
        config()->set('contact.recaptcha.site_key', 'example-public-site-key');
        config()->set('contact.recaptcha.secret_key', 'example-private-secret-key');
        config()->set('transactional-mail.provider', 'laravel');
        config()->set('mail.default', 'array');
        config()->set('cache.default', 'array');
        Cache::flush();
        Mail::fake();

        Http::preventStrayRequests();
        Http::fake([
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([
                'success' => true,
                'hostname' => 'localhost',
            ]),
        ]);
    }

    private function validContact(array $overrides = []): array
    {
        return array_replace([
            'name' => 'Test Member',
            'email' => 'visitor@example.invalid',
            'topic' => 'Exam simulator',
            'subject' => 'Exam question support',
            'message' => 'Please help me with this exam question.',
            'recaptcha_token' => 'valid-test-challenge',
            'website' => '',
        ], $overrides);
    }

    public function test_guests_can_open_contact_page_without_authentication(): void
    {
        $this->get('/contact')->assertOk()
            ->assertSee('example-public-site-key')
            ->assertDontSee('example-private-secret-key');
    }

    public function test_contact_message_requires_validation_and_email_confirmation(): void
    {
        $this->post('/contact', ['email' => 'not-an-email'])
            ->assertSessionHasErrors(['name', 'email', 'topic', 'subject', 'message', 'recaptcha_token']);

        Http::assertNothingSent();

        $this->post('/contact', $this->validContact())->assertRedirect(route('contact'));

        Http::assertSent(function ($request): bool {
            return $request->url() === 'https://www.google.com/recaptcha/api/siteverify'
                && $request['secret'] === 'example-private-secret-key'
                && $request['response'] === 'valid-test-challenge';
        });
        Mail::assertSent(ContactConfirmationLink::class, 1);
        Mail::assertNotSent(ContactSupportMessage::class);

        $confirmationUrl = null;
        Mail::assertSent(ContactConfirmationLink::class, function (ContactConfirmationLink $message) use (&$confirmationUrl): bool {
            $confirmationUrl = $message->verificationUrl;
            return true;
        });
        $this->assertNotNull($confirmationUrl);
        $this->get($confirmationUrl)->assertRedirect(route('contact'));
        Mail::assertSent(ContactSupportMessage::class, 1);
        $this->get($confirmationUrl)->assertRedirect(route('contact'));
        Mail::assertSent(ContactSupportMessage::class, 1);
    }

    public function test_failed_captcha_does_not_send_contact_confirmation(): void
    {
        Http::fake([
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([
                'success' => false,
                'error-codes' => ['timeout-or-duplicate'],
            ]),
        ]);

        $this->post('/contact', $this->validContact())->assertSessionHasErrors('recaptcha_token');
        Mail::assertNotSent(ContactConfirmationLink::class);
        Mail::assertNotSent(ContactSupportMessage::class);
    }

    public function test_captcha_solved_on_another_host_is_not_accepted(): void
    {
        Http::fake([
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([
                'success' => true,
                'hostname' => 'different-site.example',
            ]),
        ]);

        $this->post('/contact', $this->validContact())->assertSessionHasErrors('recaptcha_token');
        Mail::assertNotSent(ContactConfirmationLink::class);
    }

    public function test_google_verification_outage_fails_closed(): void
    {
        Http::fake([
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([], 503),
        ]);

        $this->post('/contact', $this->validContact())->assertSessionHasErrors('recaptcha_token');
        Mail::assertNotSent(ContactConfirmationLink::class);
    }

    public function test_missing_captcha_configuration_fails_closed(): void
    {
        config()->set('contact.recaptcha.secret_key', null);

        $this->post('/contact', $this->validContact())->assertSessionHasErrors('recaptcha_token');
        Http::assertNothingSent();
        Mail::assertNotSent(ContactConfirmationLink::class);
    }

    public function test_contact_confirmation_uses_the_existing_e2a_mail_provider(): void
    {
        config()->set('transactional-mail.provider', 'e2a');
        config()->set('transactional-mail.e2a.api_key', 'integration-test-api-key');
        config()->set('transactional-mail.e2a.sender', 'sender@example.invalid');

        Http::fake([
            'https://www.google.com/recaptcha/api/siteverify' => Http::response([
                'success' => true,
                'hostname' => 'localhost',
            ]),
            'https://api.e2a.dev/v1/agents/*/messages' => Http::response([
                'status' => 'sent',
            ], 200),
        ]);

        $this->post('/contact', $this->validContact())->assertRedirect(route('contact'));

        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/agents/')
            && str_ends_with($request->url(), '/messages')
            && $request['to'] === ['visitor@example.invalid']
            && is_string($request['html'])
            && $request['html'] !== '');
    }

    public function test_expired_or_tampered_confirmation_does_not_deliver(): void
    {
        $bad = URL::temporarySignedRoute('contact.confirm', now()->addMinutes(10), ['token' => str_repeat('x', 64)]);
        $this->get($bad)->assertRedirect(route('contact'));
        Mail::assertNotSent(ContactSupportMessage::class);
        $this->get('/contact/confirm/'.str_repeat('x', 64).'?signature=invalid')->assertForbidden();
    }
}
