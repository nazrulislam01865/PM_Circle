<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Database\Seeders\SignupMasterDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StagedOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SignupMasterDataSeeder::class);
    }

    private function verifyAndStage(string $email): void
    {
        config()->set('pm-circle.signup_verification_mode', 'fixed');
        $this->postJson('/api/auth/send-verification-code', ['email' => $email])->assertOk();
        $this->postJson('/api/auth/verify-code', ['email' => $email, 'code' => '123456'])->assertOk();
        $this->post('/join/email', ['email' => $email])->assertRedirect(route('join.profile'));
    }

    public function test_email_stage_does_not_create_an_account_until_password_and_details_are_saved(): void
    {
        $this->verifyAndStage('staged@example.com');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'staged@example.com']);
        $this->get(route('join.profile'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep2')->where('isGuest', true)->where('email', 'staged@example.com')->etc());

        $this->post(route('join.profile.save'), [
            'name' => 'New Community Member', 'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!', 'legal_acceptance' => true,
            'role' => 'Project Manager', 'years_experience' => 3,
            'certifications' => [],
        ])->assertRedirect(route('join.plan'));
        $this->assertAuthenticated();
        $user = User::query()->where('email', 'staged@example.com')->firstOrFail();
        $this->assertSame(2, $user->onboarding_step);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::driver('bcrypt')->check('SecurePass1!', $user->password));
        $this->assertDatabaseHas('profiles', ['user_id' => $user->id, 'role' => 'Project Manager', 'years_experience' => 3]);
    }

    public function test_missing_special_character_and_mismatched_passwords_are_rejected_server_side(): void
    {
        $this->verifyAndStage('rules@example.com');
        $this->post(route('join.profile.save'), [
            'name' => 'Rules Test', 'password' => 'NoSymbol123',
            'password_confirmation' => 'Different123!', 'legal_acceptance' => true,
            'certifications' => [],
        ])->assertSessionHasErrors('password');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'rules@example.com']);
    }

    public function test_registration_cannot_skip_verified_email_or_consent(): void
    {
        $this->get(route('join.profile'))->assertRedirect(route('join.account'));
        $this->post('/join/email', ['email' => 'unauthorized@example.com'])->assertSessionHasErrors('email');
        $this->verifyAndStage('consent@example.com');
        $this->post(route('join.profile.save'), [
            'name' => 'No Consent', 'password' => 'SecurePass1!',
            'password_confirmation' => 'SecurePass1!', 'legal_acceptance' => false,
            'certifications' => [],
        ])->assertSessionHasErrors('legal_acceptance');
        $this->assertDatabaseMissing('users', ['email' => 'consent@example.com']);
    }
}
