<?php

namespace Tests\Feature\Rewards;

use App\Domain\Billing\Services\ProfileCompletionRewardService;
use App\Domain\Identity\Services\ProfileCompleteness;
use App\Models\ProfileCompletionReward;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

final class ProfileCompletionRewardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('pm-circle.email_verification_required', true);
    }

    private function member(bool $complete = true): User
    {
        $user = User::factory()->create(['onboarding_step' => 3]);
        $user->profile()->create([
            'headline' => 'Project manager',
            'role' => 'Program manager',
            'industry' => 'IT',
            'country' => 'Bangladesh',
            'city' => 'Dhaka',
            'about' => 'I work with project teams.',
            'avatar_path' => $complete ? 'demo.png' : null,
            'skills' => ['Agile'],
        ]);
        $user->experiences()->create([
            'job_title' => 'Manager',
            'organization' => 'Acme',
            'employment_type' => 'Full-time',
            'start_date' => '2020-01-01',
        ]);

        return $user->fresh();
    }

    public function test_member_cannot_receive_code_before_full_profile_completion(): void
    {
        $user = $this->member(false);
        $service = app(ProfileCompletionRewardService::class);

        $this->assertSame(90, app(ProfileCompleteness::class)->percentage($user));
        $this->assertSame('pending', $service->forMember($user)['status']);
        $this->assertDatabaseCount('profile_completion_rewards', 0);
    }

    public function test_complete_profile_gets_a_unique_reusable_code_only_once(): void
    {
        $user = $this->member();
        $service = app(ProfileCompletionRewardService::class);
        $this->assertSame(100, app(ProfileCompleteness::class)->percentage($user));

        $first = $service->forMember($user);
        $second = $service->forMember($user);

        $this->assertSame('ready', $first['status']);
        $this->assertSame('10% off', $first['discountLabel']);
        $this->assertSame(5, $first['validityDays']);
        $this->assertSame($first['code'], $second['code']);
        $this->assertDatabaseCount('profile_completion_rewards', 1);
        $this->assertSame($user->id, ProfileCompletionReward::query()->first()->user_id);
    }

    public function test_members_have_distinct_codes_and_can_only_use_their_own(): void
    {
        $service = app(ProfileCompletionRewardService::class);
        $first = $this->member();
        $second = $this->member();
        $codeA = $service->forMember($first)['code'];
        $codeB = $service->forMember($second)['code'];
        $this->assertNotSame($codeA, $codeB);

        $this->expectException(ValidationException::class);
        $service->discountMinor($first, $codeB, 10000, 'BDT', 'simulator');
    }

    public function test_percent_discounts_use_minor_units_and_never_exceed_price(): void
    {
        $service = app(ProfileCompletionRewardService::class);
        $user = $this->member();
        $code = $service->forMember($user)['code'];

        $this->assertSame(1000, $service->discountMinor($user, $code, 10000, 'BDT', 'simulator'));
        $this->assertSame(1, $service->discountMinor($user, $code, 5, 'BDT', 'simulator'));
        $this->assertSame(1000, $service->discountMinor($user, $code, 10000, 'USD', 'simulator'));
    }

    public function test_fixed_discount_cannot_exceed_subtotal_and_is_currency_scoped(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->put('/admin/profile-rewards', [
            'enabled' => true, 'discount_type' => 'fixed', 'discount_value' => '500.00',
            'currency' => 'USD', 'validity_days' => 7,
        ])->assertRedirect('/admin/profile-rewards');

        $user = $this->member();
        $service = app(ProfileCompletionRewardService::class);
        $code = $service->forMember($user)['code'];
        $this->assertSame(10000, $service->discountMinor($user, $code, 10000, 'USD', 'simulator'));

        $this->expectException(ValidationException::class);
        $service->discountMinor($user, $code, 10000, 'BDT', 'simulator');
    }

    public function test_expired_and_used_rewards_are_not_redeemable(): void
    {
        $user = $this->member();
        $service = app(ProfileCompletionRewardService::class);
        $code = $service->forMember($user)['code'];
        ProfileCompletionReward::query()->where('user_id', $user->id)->update(['expires_at' => now()->subSecond()]);

        $this->assertSame('expired', $service->forMember($user)['status']);
        $this->expectException(ValidationException::class);
        $service->discountMinor($user, $code, 10000, 'BDT', 'simulator');
    }

    public function test_successful_redemption_is_idempotent_for_the_same_verified_payment(): void
    {
        $user = $this->member();
        $service = app(ProfileCompletionRewardService::class);
        $code = $service->forMember($user)['code'];

        $service->markRedeemedAfterVerifiedPayment($user, $code, 'gateway-verified-ref', 10000, 'BDT', 'simulator');
        $service->markRedeemedAfterVerifiedPayment($user, $code, 'gateway-verified-ref', 10000, 'BDT', 'simulator');

        $this->assertSame('redeemed', $service->forMember($user)['status']);
        $this->assertDatabaseHas('profile_completion_rewards', [
            'user_id' => $user->id, 'redemption_reference' => 'gateway-verified-ref',
        ]);
    }

    public function test_reducing_profile_completeness_blocks_reward_usage(): void
    {
        $user = $this->member();
        $service = app(ProfileCompletionRewardService::class);
        $code = $service->forMember($user)['code'];
        $user->profile->update(['avatar_path' => null]);
        $user->unsetRelation('profile');

        $this->expectException(ValidationException::class);
        $service->discountMinor($user, $code, 10000, 'BDT', 'simulator');
    }

    public function test_admin_routes_require_admin_and_validate_discount_values(): void
    {
        $member = $this->member();
        $this->actingAs($member)->get('/admin/profile-rewards')->assertForbidden();

        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->put('/admin/profile-rewards', [
            'enabled' => true, 'discount_type' => 'percent', 'discount_value' => 101,
            'currency' => 'BDT', 'validity_days' => 0,
        ])->assertSessionHasErrors(['discount_value', 'validity_days']);
    }

    public function test_disabled_rewards_do_not_issue_new_codes(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $this->actingAs($admin)->put('/admin/profile-rewards', [
            'enabled' => false, 'discount_type' => 'percent', 'discount_value' => 10,
            'currency' => 'BDT', 'validity_days' => 5,
        ])->assertRedirect('/admin/profile-rewards');

        $user = $this->member();
        $this->assertNull(app(ProfileCompletionRewardService::class)->forMember($user));
        $this->assertDatabaseCount('profile_completion_rewards', 0);
    }
}
