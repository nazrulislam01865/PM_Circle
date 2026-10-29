<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PMCircleOnboardingTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_requires_legal_agreement(): void
    {
        $this->post('/register', [
            'name' => 'Sample Person', 'email' => 'sample@example.com',
            'password' => 'longpassword123', 'password_confirmation' => 'longpassword123',
        ])->assertSessionHasErrors('legal_acceptance');

        $this->assertDatabaseMissing('users', ['email' => 'sample@example.com']);
    }

    public function test_unverified_member_cannot_post(): void
    {
        config()->set('pm-circle.email_verification_required', true);
        $user = User::factory()->unverified()->create(['onboarding_step' => 3]);
        $this->actingAs($user)->post('/posts', ['body' => 'This is an example community post.', 'topic' => 'I learned'])
            ->assertRedirect(route('verification.notice'));
    }

    public function test_email_verification_can_be_temporarily_disabled_without_faking_timestamp(): void
    {
        config()->set('pm-circle.email_verification_required', false);
        $user = User::factory()->unverified()->create(['onboarding_step' => 3]);
        $this->assertNull($user->email_verified_at);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->actingAs($user)->get('/dashboard')->assertOk();
    }

    public function test_paid_plan_cannot_activate_without_gateway(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', false);
        $this->seed(PlanSeeder::class);
        $user = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($user)->post(route('join.plan.save'), ['plan' => 'plus', 'months' => 1])->assertSessionHasErrors('plan');
        $this->assertSame(2, $user->fresh()->onboarding_step);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_free_plan_finishes_onboarding(): void
    {
        $this->seed(PlanSeeder::class);
        $user = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($user)->post(route('join.plan.save'), ['plan' => 'free', 'months' => 1])->assertRedirect(route('dashboard'));
        $this->assertSame(3, $user->fresh()->onboarding_step);
    }
}
