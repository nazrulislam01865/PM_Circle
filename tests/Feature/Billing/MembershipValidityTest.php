<?php

namespace Tests\Feature\Billing;

use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

final class MembershipValidityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(PlanSeeder::class);
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        config()->set('pm-circle.self_service_complimentary_access_enabled', false);
    }

    public function test_signup_stores_the_selected_duration_and_retries_do_not_extend_it(): void
    {
        $this->travelTo(Carbon::parse('2026-01-31 10:00:00', 'UTC'));
        $member = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($member)->post('/join/step/3', ['plan' => 'plus', 'months' => 3])->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('temporary_memberships', ['user_id' => $member->id, 'plan_code' => 'plus', 'months' => 3,
            'starts_at' => '2026-01-31 10:00:00', 'ends_at' => '2026-04-30 10:00:00']);
        $this->assertSame(3, (int) $member->fresh()->onboarding_step);
        $this->assertDatabaseCount('subscriptions', 0);
        $this->travel(1)->day();
        $this->post('/join/step/3', ['plan' => 'plus', 'months' => 6])->assertRedirect(route('dashboard'));
        $this->assertDatabaseHas('temporary_memberships', ['user_id' => $member->id, 'months' => 3, 'ends_at' => '2026-04-30 10:00:00']);
        $details = app(CurrentMemberPlan::class)->details($member);
        $this->assertSame('complimentary', $details['source']);
        $this->assertSame(3, $details['months']);
        $this->assertSame('plus', app(CurrentMemberPlan::class)->code($member));
        $this->travelTo(Carbon::parse('2026-04-30 10:00:00', 'UTC'));
        $this->assertSame('free', app(CurrentMemberPlan::class)->code($member));
        $this->assertSame('free', app(CurrentMemberPlan::class)->details($member)['code']);
        $this->get('/exams/pmp/enter')->assertRedirect('/exam-simulator/pmp/details');
        $this->get('/exams/pmp')->assertRedirect('/exam-simulator/pmp/details');
    }

    public function test_admin_publishes_pro_duration_and_can_disable_it_without_rewriting_membership(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
        $member = User::factory()->create(['onboarding_step' => 2]);
        $data = ['plan' => 'pro', 'months' => 9, 'amount_minor' => 500000, 'active' => true];
        $this->actingAs($member)->put('/admin/membership-validity/durations', $data)->assertForbidden();
        $this->post('/join/step/3', ['plan' => 'pro', 'months' => 9])->assertSessionHasErrors('months');
        $this->assertDatabaseMissing('temporary_memberships', ['user_id' => $member->id]);
        $this->actingAs($admin)->put('/admin/membership-validity/durations', $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->actingAs($member)->get('/join/step/3')->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep3')->where('plans.2.code', 'pro')->where('plans.2.prices.1.months', 9));
        $this->post('/join/step/3', ['plan' => 'pro', 'months' => 9])->assertRedirect(route('dashboard'));
        $before = DB::table('temporary_memberships')->where('user_id', $member->id)->first();
        $this->actingAs($admin)->put('/admin/membership-validity/durations', [...$data, 'active' => false])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($before->ends_at, DB::table('temporary_memberships')->where('user_id', $member->id)->value('ends_at'));
        $another = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($another)->post('/join/step/3', ['plan' => 'pro', 'months' => 9])->assertSessionHasErrors('months');
    }

    public function test_admin_controls_signup_plan_card_without_changing_existing_terms(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
        $member = User::factory()->create(['onboarding_step' => 2]);
        $endpoint = '/admin/membership-validity/signup-plans/pro';
        $data = ['name' => 'Pro membership', 'benefits' => ['Full exam practice'], 'signup_badge' => 'Featured', 'signup_visible' => true];
        $this->actingAs($member)->put($endpoint, $data)->assertForbidden();
        $this->actingAs($admin)->put($endpoint, $data)->assertRedirect()->assertSessionHasNoErrors();
        $this->actingAs($member)->get('/join/step/3')->assertInertia(fn (Assert $page) => $page
            ->component('auth/RegisterStep3')->where('plans.2.code', 'pro')->where('plans.2.name', 'Pro membership')
            ->where('plans.2.benefits.0', 'Full exam practice')->where('plans.2.signup_badge', 'Featured'));
        $this->post('/join/step/3', ['plan' => 'pro', 'months' => 1])->assertRedirect(route('dashboard'));
        $end = DB::table('temporary_memberships')->where('user_id', $member->id)->value('ends_at');
        $this->actingAs($admin)->put($endpoint, [...$data, 'signup_visible' => false])->assertRedirect()->assertSessionHasNoErrors();
        $another = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($another)->get('/join/step/3')->assertInertia(fn (Assert $page) => $page->has('plans', 2));
        $this->post('/join/step/3', ['plan' => 'pro', 'months' => 1])->assertSessionHasErrors('months');
        $this->assertDatabaseMissing('temporary_memberships', ['user_id' => $another->id]);
        $this->assertSame($end, DB::table('temporary_memberships')->where('user_id', $member->id)->value('ends_at'));
        $this->assertSame('pro', app(CurrentMemberPlan::class)->code($member));
        $this->assertTrue(Plan::where('code', 'pro')->firstOrFail()->active);
        $this->actingAs($admin)->put('/admin/membership-validity/signup-plans/free', [...$data, 'name' => 'Free', 'signup_visible' => false])->assertRedirect();
        $this->assertTrue(Plan::where('code', 'free')->firstOrFail()->signup_visible);
    }

    public function test_member_validity_search_is_admin_only_and_returns_only_eligible_members(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3, 'name' => 'Validity Search Admin']);
        $member = User::factory()->create(['name' => 'Validity Search Member', 'email' => 'validity-search@example.test', 'onboarding_step' => 3]);
        $free = User::factory()->create(['name' => 'Validity Search Free', 'onboarding_step' => 3]);
        foreach ([$member, $admin] as $user) {
            DB::table('temporary_memberships')->insert(['user_id' => $user->id, 'plan_code' => 'pro', 'created_at' => now(), 'updated_at' => now()]);
        }
        $endpoint = '/admin/membership-validity';
        $this->actingAs($free)->get($endpoint.'?q=Validity')->assertForbidden();
        $this->actingAs($admin)->get($endpoint)->assertInertia(fn (Assert $page) => $page->has('memberMatches', 0));
        $this->get($endpoint.'?q=VALIDITY%20SEARCH')->assertInertia(fn (Assert $page) => $page
            ->has('memberMatches', 1)->where('memberMatches.0.id', $member->id)->where('memberMatches.0.plan_code', 'pro'));
        $this->get($endpoint.'?q=validity-search%40example.test')->assertInertia(fn (Assert $page) => $page
            ->has('memberMatches', 1)->where('memberMatches.0.email', $member->email));
        $this->get($endpoint.'?q=%25%25')->assertInertia(fn (Assert $page) => $page->has('memberMatches', 0));
        $this->get($endpoint.'?member_id='.$member->id)->assertInertia(fn (Assert $page) => $page
            ->where('member.id', $member->id)->where('member.email', $member->email));
        $this->get($endpoint.'?member_id='.$admin->id)->assertInertia(fn (Assert $page) => $page->where('member', null));
    }

    public function test_admin_assigns_and_adjusts_legacy_terms_and_members_cannot_edit_them(): void
    {
        $this->travelTo(Carbon::parse('2026-01-31 10:00:00', 'UTC'));
        $member = User::factory()->create(['onboarding_step' => 3]);
        $admin = User::factory()->create(['is_admin' => true, 'onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert(['user_id' => $member->id, 'plan_code' => 'pro', 'created_at' => now(), 'updated_at' => now()]);
        $endpoint = '/admin/membership-validity/members/'.$member->id;
        $this->assertNull(app(CurrentMemberPlan::class)->details($member)['ends_at']);
        $this->actingAs($member)->put($endpoint, ['months' => 6, 'restart' => true])->assertForbidden();
        $this->actingAs($admin)->put($endpoint, ['months' => 6, 'restart' => false])->assertSessionHasErrors('restart');
        $this->put($endpoint, ['months' => 6, 'restart' => true])->assertRedirect()->assertSessionHasNoErrors();
        $this->travel(1)->day();
        $this->put($endpoint, ['months' => 1, 'restart' => false])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertDatabaseHas('temporary_memberships', ['user_id' => $member->id, 'months' => 1, 'starts_at' => '2026-01-31 10:00:00', 'ends_at' => '2026-02-28 10:00:00']);
        $this->actingAs($member)->post('/membership/temporary', ['plan' => 'pro', 'months' => 1])->assertRedirect();
        $this->assertDatabaseHas('temporary_memberships', ['user_id' => $member->id, 'ends_at' => '2026-02-28 10:00:00']);
    }

    public function test_signup_access_does_not_automatically_allow_post_signup_demo_switching(): void
    {
        config()->set('pm-circle.temporary_paid_access_enabled', false);
        config()->set('pm-circle.self_service_complimentary_access_enabled', true);
        config()->set('pm-circle.self_service_complimentary_switching_enabled', false);
        $member = User::factory()->create(['onboarding_step' => 2]);
        $this->actingAs($member)->post('/join/step/3', ['plan' => 'plus', 'months' => 3])->assertRedirect(route('dashboard'));
        $before = DB::table('temporary_memberships')->where('user_id', $member->id)->value('ends_at');
        $this->post('/membership/temporary', ['plan' => 'pro', 'months' => 1])->assertForbidden();
        $this->assertSame($before, DB::table('temporary_memberships')->where('user_id', $member->id)->value('ends_at'));
        $this->assertSame('plus', app(CurrentMemberPlan::class)->code($member));
    }

    public function test_expired_complimentary_term_falls_back_to_verified_paid_subscription(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $price = Plan::where('code', 'plus')->firstOrFail()->prices()->where('months', 1)->firstOrFail();
        DB::table('temporary_memberships')->insert(['user_id' => $member->id, 'plan_code' => 'pro', 'months' => 1,
            'starts_at' => now()->subMonthsNoOverflow(2), 'ends_at' => now()->subMonthNoOverflow(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('subscriptions')->insert(['user_id' => $member->id, 'plan_price_id' => $price->id,
            'status' => 'active', 'starts_at' => now()->subDay(), 'ends_at' => now()->addDays(29), 'created_at' => now(), 'updated_at' => now()]);
        $this->assertSame('plus', app(CurrentMemberPlan::class)->code($member));
        $this->assertSame('subscription', app(CurrentMemberPlan::class)->details($member)['source']);
    }
}
