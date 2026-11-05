<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Support\SignupVerificationMode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SignupVerificationModesTest extends TestCase
{
    use RefreshDatabase;

    public function test_local_fixed_code_is_shown_without_sending_mail_and_is_session_bound(): void
    {
        config()->set('pm-circle.signup_verification_mode', 'fixed');
        Mail::fake();

        $this->get('/register')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep1')
            ->where('signupVerificationMode', 'fixed')
            ->etc());

        $this->postJson('/api/auth/verify-code', ['email' => 'fixed@example.com', 'code' => '123456'])
            ->assertUnprocessable();

        $this->postJson('/api/auth/send-verification-code', ['email' => 'fixed@example.com'])
            ->assertOk()->assertJsonPath('development_code', '123456');
        Mail::assertNothingSent();

        $this->postJson('/api/auth/verify-code', ['email' => 'other@example.com', 'code' => '123456'])
            ->assertUnprocessable();
        $this->postJson('/api/auth/verify-code', ['email' => 'fixed@example.com', 'code' => '123456'])
            ->assertOk()->assertJsonPath('verified', true);

        $this->post('/register', $this->registration('fixed@example.com'))
            ->assertSessionHasNoErrors();
        $this->assertAuthenticated();
        $this->assertNotNull(User::query()->where('email', 'fixed@example.com')->firstOrFail()->email_verified_at);
    }

    public function test_local_off_mode_skips_code_without_claiming_email_ownership(): void
    {
        config()->set('pm-circle.signup_verification_mode', 'off');
        config()->set('pm-circle.email_verification_required', false);
        Mail::fake();

        $this->get('/register')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep1')
            ->where('signupVerificationMode', 'off')
            ->etc());
        $this->postJson('/api/auth/send-verification-code', ['email' => 'skip@example.com'])->assertNotFound();
        $this->postJson('/api/auth/verify-code', ['email' => 'skip@example.com', 'code' => '123456'])
            ->assertNotFound();

        $this->post('/register', $this->registration('skip@example.com'))->assertSessionHasNoErrors();
        $this->assertAuthenticated();
        $this->assertNull(User::query()->where('email', 'skip@example.com')->firstOrFail()->email_verified_at);
        Mail::assertNothingSent();
    }

    public function test_local_fixed_mode_still_requires_the_correct_code(): void
    {
        config()->set('pm-circle.signup_verification_mode', 'fixed');

        $this->postJson('/api/auth/send-verification-code', ['email' => 'member@example.com'])->assertOk();
        $this->postJson('/api/auth/verify-code', ['email' => 'member@example.com', 'code' => '654321'])
            ->assertUnprocessable();
        $this->post('/register', $this->registration('member@example.com'))
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_development_modes_are_unavailable_outside_local_and_testing(): void
    {
        config()->set('pm-circle.signup_verification_mode', 'off');
        app()->detectEnvironment(fn () => 'production');
        try {
            $this->assertSame('email', SignupVerificationMode::current());
            config()->set('pm-circle.signup_verification_mode', 'fixed');
            $this->assertSame('email', SignupVerificationMode::current());
        } finally {
            app()->detectEnvironment(fn () => 'testing');
        }
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
