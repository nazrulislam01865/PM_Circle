<?php

namespace Tests\Feature\Billing;

use App\Domain\Billing\Actions\SetTemporaryMembership;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class TemporaryMembershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PlanSeeder::class);
    }

    public function test_guests_cannot_change_membership(): void
    {
        $this->post('/membership/temporary', ['plan' => 'pro'])->assertRedirect('/login');
    }

    public function test_member_can_switch_plus_pro_and_free_without_creating_paid_subscriptions(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $member = User::factory()->create(['onboarding_step' => 3]);

        foreach (['plus' => 'premium', 'pro' => 'pro', 'free' => 'free'] as $plan => $dashboardPlan) {
            $this->actingAs($member)->post('/membership/temporary', ['plan' => $plan])
                ->assertRedirect(route('dashboard'));
            $this->assertSame($plan, app(CurrentMemberPlan::class)->code($member));
            $this->actingAs($member)->get('/dashboard')->assertInertia(fn (Assert $page) =>
                $page->where('dashboard.plan', $dashboardPlan)
            );
        }
        $this->assertDatabaseCount('temporary_memberships', 1);
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_onboarding_accepts_plus_without_checkout_when_temporary_access_is_enabled(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $member = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($member)->post('/join/step/3', ['plan' => 'plus', 'months' => 3])
            ->assertRedirect(route('dashboard'));
        $this->assertSame(3, $member->fresh()->onboarding_step);
        $this->assertSame('plus', app(CurrentMemberPlan::class)->code($member));
        $this->assertDatabaseCount('subscriptions', 0);
    }

    public function test_temporary_membership_endpoint_is_disabled_when_configured_off(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', false);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->post('/membership/temporary', ['plan' => 'pro'])->assertForbidden();
        $this->assertDatabaseCount('temporary_memberships', 0);
    }

    public function test_temporary_membership_is_never_honored_in_production(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->post('/membership/temporary', ['plan' => 'pro'])->assertRedirect();
        app()->detectEnvironment(fn () => 'production');
        $this->assertFalse(SetTemporaryMembership::enabled());
        $this->assertSame('free', app(CurrentMemberPlan::class)->code($member));
        $this->actingAs($member)->post('/membership/temporary', ['plan' => 'plus'])->assertForbidden();
    }

    public function test_temporary_membership_is_specific_to_its_owner_and_validated(): void
    {
        $first = User::factory()->create(['onboarding_step' => 3]);
        $second = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($first)->post('/membership/temporary', ['plan' => 'pro'])->assertRedirect();
        $this->assertSame('free', app(CurrentMemberPlan::class)->code($second));
        $this->actingAs($second)->post('/membership/temporary', ['plan' => 'enterprise'])
            ->assertSessionHasErrors('plan');
        $this->assertDatabaseCount('temporary_memberships', 1);
    }
}
