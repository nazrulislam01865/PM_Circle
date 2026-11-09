<?php

namespace Tests\Feature\Auth;

use App\Mail\PasswordResetLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Mail::fake() intercepts Laravel mail, not the E2A HTTP provider.
        // E2A-specific cases explicitly opt into the HTTP provider below.
        config()->set('transactional-mail.provider', 'laravel');

        $this->skipUnlessFortifyHas(Features::resetPasswords());
    }

    public function test_reset_password_link_screen_can_be_rendered()
    {
        $response = $this->get(route('password.request'));

        $response->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/forgot-password')
            ->where('resetLinkMinutes', 10)
            ->etc());
    }

    public function test_reset_password_link_can_be_requested()
    {
        Mail::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Mail::assertSent(PasswordResetLink::class, fn (PasswordResetLink $mail) => str_contains($mail->resetUrl, 'email='));
    }

    public function test_reset_password_screen_can_be_rendered()
    {
        Mail::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Mail::assertSent(PasswordResetLink::class, function (PasswordResetLink $mail) {
            $response = $this->get($mail->resetUrl);

            $response->assertOk();

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token()
    {
        Mail::fake();

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email]);

        Mail::assertSent(PasswordResetLink::class, function (PasswordResetLink $mail) use ($user) {
            $token = basename(parse_url($mail->resetUrl, PHP_URL_PATH));
            $response = $this->post(route('password.update'), [
                'token' => $token,
                'email' => $user->email,
                'password' => 'SecurePass1!',
                'password_confirmation' => 'SecurePass1!',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            $this->assertTrue(Hash::check('SecurePass1!', $user->fresh()->password));

            return true;
        });
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_reset_email_uses_the_existing_e2a_provider_and_includes_one_secure_link(): void
    {
        config()->set('transactional-mail.provider', 'e2a');
        config()->set('transactional-mail.e2a.api_key', 'testing-key');
        config()->set('transactional-mail.e2a.sender', 'noreply@agents.e2a.dev');
        Http::fake(['api.e2a.dev/*' => Http::response(['status' => 'accepted'], 202)]);

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHasNoErrors();

        Http::assertSentCount(1);
        Http::assertSent(function ($request) use ($user): bool {
            $body = $request->data();

            return $request->url() === 'https://api.e2a.dev/v1/agents/noreply%40agents.e2a.dev/messages'
                && $body['to'] === [$user->email]
                && str_contains($body['html'], 'Reset my password')
                && str_contains($body['text'], '/reset-password/')
                && str_contains($body['text'], '10 minutes')
                && ! empty($request->header('Idempotency-Key'));
        });
    }

    public function test_email_delivery_failure_is_displayed_as_a_validation_error(): void
    {
        config()->set('transactional-mail.provider', 'e2a');
        config()->set('transactional-mail.e2a.api_key', 'testing-key');
        config()->set('transactional-mail.e2a.sender', 'noreply@agents.e2a.dev');
        Http::fake(['api.e2a.dev/*' => Http::response(['status' => 'pending_review'], 202)]);

        $user = User::factory()->create();

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertRedirect()
            ->assertSessionHasErrors('email');
    }

    public function test_reset_token_cannot_be_used_twice(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $this->post(route('password.email'), ['email' => $user->email]);

        $token = null;
        Mail::assertSent(PasswordResetLink::class, function (PasswordResetLink $mail) use (&$token): bool {
            $token = basename(parse_url($mail->resetUrl, PHP_URL_PATH));

            return true;
        });
        $input = [
            'token' => $token,
            'email' => $user->email,
            'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!',
        ];

        $this->post(route('password.update'), $input)->assertSessionHasNoErrors();
        $this->post(route('password.update'), $input)->assertSessionHasErrors('email');
    }

    public function test_weak_password_is_rejected_by_reset_rules(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $this->post(route('password.email'), ['email' => $user->email]);

        $token = null;
        Mail::assertSent(PasswordResetLink::class, function (PasswordResetLink $mail) use (&$token): bool {
            $token = basename(parse_url($mail->resetUrl, PHP_URL_PATH));

            return true;
        });

        $this->post(route('password.update'), [
            'token' => $token,
            'email' => $user->email,
            'password' => 'weakpassword',
            'password_confirmation' => 'weakpassword',
        ])->assertSessionHasErrors('password');
    }

}
