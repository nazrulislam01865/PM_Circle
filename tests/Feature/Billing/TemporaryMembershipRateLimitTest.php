<?php

namespace Tests\Feature\Billing;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class TemporaryMembershipRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-circle.self_service_complimentary_access_enabled', false);
    }

    public function test_notification_requests_do_not_exhaust_membership_switch_limit(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member);
        for ($i = 0; $i < 10; $i++) {
            $this->getJson(route('notifications.feed'))->assertOk();
        }
        $this->post(route('membership.temporary'), ['plan' => 'free'])
            ->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('temporary_memberships', [
            'user_id' => $member->id, 'plan_code' => 'free',
        ]);
    }

    public function test_actual_switch_limit_returns_inline_inertia_error_and_preserves_json_429(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member);
        for ($i = 0; $i < 10; $i++) {
            $this->from(route('membership.index'))
                ->post(route('membership.temporary'), ['plan' => 'invalid'])
                ->assertSessionHasErrors('plan');
        }
        $this->withHeader('X-Inertia', 'true')
            ->post(route('membership.temporary'), ['plan' => 'free'])
            ->assertStatus(303)
            ->assertRedirect(route('membership.index'))
            ->assertSessionHasErrors('plan');
        $this->assertStringContainsString('Too many membership switch requests. Try again in ', session('errors')->first('plan'));
        $this->postJson(route('membership.temporary'), ['plan' => 'free'])
            ->assertStatus(429)->assertHeader('Retry-After');
        $this->assertDatabaseMissing('temporary_memberships', ['user_id' => $member->id]);

        $other = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($other)->post(route('membership.temporary'), ['plan' => 'free'])
            ->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('temporary_memberships', ['user_id' => $other->id, 'plan_code' => 'free']);
        $this->assertSame(0, DB::table('subscriptions')->count());
    }

    public function test_disabled_demo_switching_still_returns_forbidden(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', false);
        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->post(route('membership.temporary'), ['plan' => 'pro'])->assertForbidden();
        $this->assertDatabaseMissing('temporary_memberships', ['user_id' => $member->id]);
    }
}
