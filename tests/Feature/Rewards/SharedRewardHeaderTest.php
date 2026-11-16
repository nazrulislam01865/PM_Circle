<?php

namespace Tests\Feature\Rewards;

use App\Domain\Billing\Services\ProfileCompletionRewardService;
use App\Models\ProfileRewardSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

final class SharedRewardHeaderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_guest_and_member_receive_the_same_configured_header_offer(): void
    {
        $this->withoutVite();
        $this->get('/help-center')->assertOk()->assertInertia(fn ($page) => $page
            ->where('rewardPromotion.discountLabel', '10% off'));

        $member = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($member)->get('/help-center')->assertOk()->assertInertia(fn ($page) => $page
            ->where('rewardPromotion.discountLabel', '10% off'));
    }

    public function test_disabled_reward_does_not_show_in_shared_header(): void
    {
        ProfileRewardSetting::query()->updateOrCreate(['id' => 1], [
            'enabled' => false, 'discount_type' => 'percent',
            'discount_value' => 10, 'currency' => 'BDT', 'validity_days' => 5,
        ]);
        app(ProfileCompletionRewardService::class)->clearSettingsCache();

        $this->withoutVite();
        $this->get('/help-center')->assertOk()->assertInertia(fn ($page) => $page
            ->where('rewardPromotion', null));
    }
}
