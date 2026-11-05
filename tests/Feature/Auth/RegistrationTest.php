<?php

namespace Tests\Feature\Auth;

use App\Mail\SignupVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        Mail::fake();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'test@example.com'])->assertOk();
        $code = '';
        Mail::assertSent(SignupVerificationCode::class, function (SignupVerificationCode $mail) use (&$code): bool {
            $code = $mail->code;
            return true;
        });
        $this->postJson('/api/auth/verify-code', ['email' => 'test@example.com', 'code' => $code])->assertOk();

        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'Longpassword123!',
            'password_confirmation' => 'Longpassword123!',
            'legal_acceptance' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }
}
