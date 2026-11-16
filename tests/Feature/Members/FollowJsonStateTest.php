<?php

namespace Tests\Feature\Members;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class FollowJsonStateTest extends TestCase
{
    use RefreshDatabase;

    public function test_follow_and_unfollow_return_authoritative_state_without_page_reload(): void
    {
        $viewer = User::factory()->create(['onboarding_step' => 3]);
        $target = User::factory()->create(['onboarding_step' => 3]);
        $target->profile()->create(['visibility' => 'public']);

        $this->actingAs($viewer)->postJson("/members/{$target->id}/follow")
            ->assertOk()->assertJsonPath('following', true);
        $this->actingAs($viewer)->postJson("/members/{$target->id}/follow")
            ->assertOk()->assertJsonPath('following', true);
        $this->assertDatabaseCount('member_follows', 1);

        $this->actingAs($viewer)->deleteJson("/members/{$target->id}/follow")
            ->assertOk()->assertJsonPath('following', false);
        $this->assertDatabaseCount('member_follows', 0);
        $this->actingAs($viewer)->postJson("/members/{$viewer->id}/follow")
            ->assertStatus(422);
    }
}
