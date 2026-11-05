<?php

namespace Tests\Feature\Auth;

use App\Mail\SignupVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationPasswordSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_seven_character_password_is_rejected(): void
    {
        $this->post('/register', [
            'name' => 'Example Member',
            'email' => 'seven@example.com',
            'password' => 'Abc1234',
            'password_confirmation' => 'Abc1234',
            'legal_acceptance' => true,
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'seven@example.com']);
    }

    public function test_eight_character_password_is_stored_as_bcrypt_hash(): void
    {
        Mail::fake();
        $this->postJson('/api/auth/send-verification-code', ['email' => 'eight@example.com'])->assertOk();
        $code = '';
        Mail::assertSent(SignupVerificationCode::class, function (SignupVerificationCode $mail) use (&$code): bool {
            $code = $mail->code;
            return true;
        });
        $this->postJson('/api/auth/verify-code', ['email' => 'eight@example.com', 'code' => $code])->assertOk();

        $plainText = 'Abc1234!';

        $this->post('/register', [
            'name' => 'Example Member',
            'email' => 'eight@example.com',
            'password' => $plainText,
            'password_confirmation' => $plainText,
            'legal_acceptance' => true,
        ])->assertSessionHasNoErrors();

        $user = User::query()->where('email', 'eight@example.com')->firstOrFail();

        $this->assertNotSame($plainText, $user->password);
        $this->assertMatchesRegularExpression('/^\$2[aby]\$\d{2}\$/', $user->password);
        $this->assertTrue(Hash::driver('bcrypt')->check($plainText, $user->password));
    }
}
