<?php

namespace Tests\Feature\Auth;

use App\Mail\SignupVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class SignupEmailCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_signup_requires_verification_of_the_same_email(): void
    {
        $this->post('/register', $this->registration('member@example.com'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        Mail::fake();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])->assertOk()
            ->assertJsonMissing(['dev_code']);

        $code = $this->sentCode();
        $this->postJson('/api/auth/verify-code', ['email' => 'other@example.com', 'code' => $code])
            ->assertUnprocessable();
        $this->postJson('/api/auth/verify-code', ['email' => 'member@example.com', 'code' => $code])
            ->assertOk()->assertJsonPath('verified', true);

        $this->post('/register', $this->registration('different@example.com'))
            ->assertSessionHasErrors('email');
        $this->post('/register', $this->registration('member@example.com'))->assertSessionHasNoErrors();
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', ['email' => 'member@example.com']);
        $this->assertNotNull(auth()->user()->email_verified_at);
    }

    public function test_codes_are_random_and_attempt_limited_without_a_bypass(): void
    {
        Mail::fake();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])->assertOk();
        $code = $this->sentCode();
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/verify-code', ['email' => 'member@example.com', 'code' => '000000'])
                ->assertUnprocessable();
        }
        $this->postJson('/api/auth/verify-code', ['email' => 'member@example.com', 'code' => $code])
            ->assertUnprocessable();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])
            ->assertStatus(429);
    }

    public function test_failed_mail_delivery_does_not_create_a_valid_code(): void
    {
        Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP offline'));
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])
            ->assertStatus(503);
        // A failed delivery must not create a verification challenge.
        $this->postJson('/api/auth/verify-code', ['email' => 'member@example.com', 'code' => '123456'])
            ->assertUnprocessable();
        $this->post('/register', $this->registration('member@example.com'))
            ->assertSessionHasErrors('email');
    }

    /** @return array<string, mixed> */
    private function registration(string $email): array
    {
        return [
            'name' => 'Example Member',
            'email' => $email,
            'password' => 'ValidPassword123!',
            'password_confirmation' => 'ValidPassword123!',
            'legal_acceptance' => true,
        ];
    }

    private function sentCode(): string
    {
        $code = '';
        Mail::assertSent(SignupVerificationCode::class, function (SignupVerificationCode $mail) use (&$code): bool {
            $code = $mail->code;
            return true;
        });

        return $code;
    }
}
