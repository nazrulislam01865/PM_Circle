<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Support\FakesE2aSignupEmail;
use Tests\TestCase;

class SignupEmailCodeTest extends TestCase
{
    use RefreshDatabase;
    use FakesE2aSignupEmail;

    public function test_signup_requires_verification_of_the_same_email(): void
    {
        $this->post('/register', $this->registration('member@example.com'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->fakeSuccessfulE2aSignupEmail();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])->assertOk()
            ->assertJsonMissing(['dev_code']);

        $code = $this->sentSignupCode('member@example.com');
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
        $this->fakeSuccessfulE2aSignupEmail();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])->assertOk();
        $code = $this->sentSignupCode('member@example.com');
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

    public function test_failed_e2a_delivery_does_not_create_a_valid_code(): void
    {
        $this->configureE2aSignupEmail();
        Http::fake(['api.e2a.dev/*' => Http::response(['error' => 'Unavailable'], 503)]);
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
}
