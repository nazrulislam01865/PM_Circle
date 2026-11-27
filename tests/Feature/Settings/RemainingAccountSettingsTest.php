<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class RemainingAccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_interview_options_follow_active_master_data_and_reject_disabled_values(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        DB::table('master_data_options')->insert([
            'category' => 'interview_role', 'value' => 'Portfolio Lead', 'label' => 'Portfolio Lead',
            'sort_order' => 999, 'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($member)->patch('/settings/account', ['role' => 'Portfolio Lead'])->assertSessionHasNoErrors();
        $this->assertSame('Portfolio Lead', $member->fresh()->account_preferences['role']);
        DB::table('master_data_options')->where('category', 'interview_role')->where('value', 'Portfolio Lead')->update(['is_active' => false]);
        $this->patch('/settings/account', ['role' => 'Portfolio Lead'])->assertSessionHasErrors('role');
    }

    public function test_follow_opt_out_blocks_new_follow_but_allows_existing_follower_to_leave(): void
    {
        $target = User::factory()->create(['onboarding_step' => 3]);
        $target->profile()->create(['visibility' => 'public']);
        $follower = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        $this->actingAs($follower)->postJson("/members/{$target->id}/follow")->assertOk();
        $this->actingAs($target)->patch('/settings/account', ['follow' => 'No one'])->assertSessionHasNoErrors();
        $this->actingAs($other)->postJson("/members/{$target->id}/follow")->assertForbidden();
        $this->actingAs($follower)->deleteJson("/members/{$target->id}/follow")->assertOk()->assertJsonPath('following', false);
        $this->assertDatabaseCount('member_follows', 0);
    }

    public function test_payment_history_is_member_scoped_and_paged_without_gateway_secrets(): void
    {
        $member = User::factory()->create(['onboarding_step' => 3]);
        $other = User::factory()->create(['onboarding_step' => 3]);
        foreach ([$member->id, $other->id] as $owner) {
            DB::table('payment_orders')->insert([
                'uuid' => (string) Str::uuid(), 'user_id' => $owner, 'idempotency_key' => (string) Str::uuid(),
                'product_type' => 'membership', 'product_id' => 1, 'product_snapshot' => '{}',
                'amount_minor' => 25000, 'currency' => 'BDT', 'provider' => 'bkash', 'status' => 'pending',
                'checkout_url_encrypted' => 'secret', 'expires_at' => now()->addHour(), 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        $response = $this->actingAs($member)->getJson('/settings/account/payments');
        $response->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('hasMore', false)->assertJsonMissingPath('data.0.checkout_url_encrypted');
        $this->assertSame(25000, (int) $response->json('data.0.amount_minor'));
        $this->assertSame(DB::table('payment_orders')->where('user_id', $member->id)->value('uuid'), $response->json('data.0.uuid'));
        $this->getJson('/settings/account/payments?page=0')->assertUnprocessable();
    }
}
