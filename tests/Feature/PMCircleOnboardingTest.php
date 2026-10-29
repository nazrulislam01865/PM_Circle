<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PlanPrice;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
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

    public function test_signup_plan_step_receives_all_configured_plus_durations(): void
    {
        $this->seed(PlanSeeder::class);
        $user = User::factory()->create(['onboarding_step' => 2]);

        $this->actingAs($user)->get(route('join.plan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/RegisterStep3')
                ->has('plans', 3)
                ->where('plans.1.code', 'plus')
                ->has('plans.1.prices', 4)
                ->where('plans.1.prices.0.months', 1)
                ->where('plans.1.prices.1.months', 3)
                ->where('plans.1.prices.2.months', 6)
                ->where('plans.1.prices.3.months', 12)
                ->etc());
    }

    public function test_unseeded_signup_returns_empty_catalog_instead_of_inventing_a_plan(): void
    {
        $user = User::factory()->create(['onboarding_step' => 2]);

        $this->actingAs($user)->get(route('join.plan'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/RegisterStep3')
                ->has('plans', 0)
                ->etc());
    }

    public function test_plan_catalog_repair_preserves_existing_admin_prices_and_inactive_plans(): void
    {
        $this->seed(PlanSeeder::class);
        $plus = Plan::query()->where('code', 'plus')->firstOrFail();
        $plus->update(['benefits' => ['Custom administrator benefit']]);
        $price = PlanPrice::query()->where('plan_id', $plus->id)->where('months', 1)->firstOrFail();
        $price->update(['amount_minor' => 45900]);
        $pro = Plan::query()->where('code', 'pro')->firstOrFail();
        $pro->update(['active' => false]);
        PlanPrice::query()->where('plan_id', $plus->id)->where('months', 6)->delete();

        $this->seed(PlanSeeder::class);

        $this->assertSame(45900, $price->fresh()->amount_minor);
        $this->assertSame(['Custom administrator benefit'], $plus->fresh()->benefits);
        $this->assertFalse($pro->fresh()->active);
        $this->assertDatabaseHas('plan_prices', ['plan_id' => $plus->id, 'months' => 6, 'amount_minor' => 180000]);
        $this->assertDatabaseCount('plans', 3);
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
