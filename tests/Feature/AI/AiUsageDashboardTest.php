<?php

namespace Tests\Feature\AI;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AiUsageDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function administrator(array $permissions): User
    {
        $admin = User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'email_verified_at' => now(),
        ]);
        foreach ($permissions as $permission) {
            DB::table('ai_admin_permissions')->insert([
                'user_id' => $admin->id, 'permission' => $permission,
                'created_at' => now(),
            ]);
        }
        return $admin;
    }

    public function test_admin_without_separate_ai_permission_cannot_read_usage_page(): void
    {
        $this->withoutVite();
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($member)->get('/admin/ai/usage-management')->assertForbidden();
        $this->actingAs($this->administrator([]))->get('/admin/ai/usage-management')
            ->assertForbidden();
    }

    public function test_read_only_ai_admin_sees_dashboard_but_not_member_lookup(): void
    {
        $this->withoutVite();
        $admin = $this->administrator(['ai.view_reports']);
        $this->actingAs($admin)->get('/admin/ai/usage-management')
            ->assertOk()->assertInertia(fn ($page) => $page
                ->component('admin/AiUsageManagement')
                ->where('capabilities.quotas', false)
                ->where('capabilities.credits', false)
                ->has('byFeature')
            );
        $this->getJson('/admin/ai/usage-management/members?q=test')->assertForbidden();
        $this->postJson('/admin/ai/chat-limits/policies', [])->assertForbidden();
    }

    public function test_quota_admin_can_search_and_preview_one_member_without_private_prompts(): void
    {
        $this->withoutVite();
        $admin = $this->administrator(['ai.view_reports', 'ai.manage_quotas']);
        $member = User::factory()->create([
            'name' => 'Jordan Example', 'email' => 'jordan@example.test', 'is_admin' => false,
        ]);
        $this->actingAs($admin)->getJson('/admin/ai/usage-management/members?q=jordan')
            ->assertOk()->assertJsonPath('members.0.id', $member->id);
        $this->getJson('/admin/ai/usage-management/members?q=x')->assertUnprocessable();
        $this->getJson('/admin/ai/usage-management/members/'.$member->id)
            ->assertOk()->assertJsonPath('member.email', 'jordan@example.test')
            ->assertJsonPath('plan', 'free')
            ->assertJsonPath('limits.pmp.code', 'CHAT_POLICY_NOT_CONFIGURED')
            ->assertJsonMissingPath('member.password');
    }

    public function test_versioned_limits_override_and_revoke_reuse_the_audited_endpoints(): void
    {
        $admin = $this->administrator(['ai.view_reports', 'ai.manage_quotas']);
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($admin);
        $policy = [
            'plan_code' => 'free', 'feature_scope' => 'feature:pmp',
            'max_daily' => 2, 'max_cycle' => 12, 'max_per_conversation' => 4,
            'max_concurrent' => 1, 'max_cycle_tokens' => 4000,
            'active_from_utc' => now()->addMinute()->toISOString(),
            'reason' => 'Approved limited member allocation',
        ];
        $this->postJson('/admin/ai/chat-limits/policies', $policy)->assertCreated()
            ->assertJsonPath('version', 1);
        $this->assertDatabaseHas('ai_chat_limit_policies', ['plan_code' => 'free', 'version' => 1]);
        $this->postJson('/admin/ai/chat-limits/policies', $policy)->assertCreated()
            ->assertJsonPath('version', 2);
        $result = $this->postJson('/admin/ai/chat-limits/overrides', [
            'user_id' => $member->id, 'feature_scope' => 'feature:pmp',
            'max_cycle_tokens' => 3000, 'starts_at_utc' => now()->toISOString(),
            'reason' => 'Approved individual token allocation',
        ])->assertCreated();
        $id = $result->json('id');
        $this->postJson('/admin/ai/chat-limits/overrides/'.$id.'/revoke', [
            'reason' => 'Limit adjustment no longer required',
        ])->assertOk()->assertJsonPath('status', 'revoked');
        $this->assertDatabaseHas('ai_chat_user_overrides', ['id' => $id, 'status' => 'revoked']);
        $this->assertSame(4, DB::table('ai_audit_events')->whereIn('action', [
            'chat_policy.publish', 'chat_override.create', 'chat_override.revoke',
        ])->count());
    }

    public function test_plus_and_pro_pmp_limits_are_independent_with_short_audit_reasons(): void
    {
        $admin = $this->administrator(['ai.view_reports', 'ai.manage_quotas']);
        $this->actingAs($admin);

        foreach (['plus' => 40000, 'pro' => 120000] as $plan => $tokens) {
            $this->postJson('/admin/ai/chat-limits/policies', [
                'plan_code' => $plan, 'feature_scope' => 'feature:pmp',
                'max_daily' => $plan === 'plus' ? 10 : 25,
                'max_cycle' => 60, 'max_per_conversation' => 10, 'max_concurrent' => 1,
                'max_cycle_tokens' => $tokens,
                'active_from_utc' => now()->addMinutes(5)->toISOString(),
                'reason' => 'test',
            ])->assertCreated();
        }

        $this->assertDatabaseHas('ai_chat_limit_policies', [
            'plan_code' => 'plus', 'feature_scope' => 'feature:pmp', 'max_cycle_tokens' => 40000,
        ]);
        $this->assertDatabaseHas('ai_chat_limit_policies', [
            'plan_code' => 'pro', 'feature_scope' => 'feature:pmp', 'max_cycle_tokens' => 120000,
        ]);
        $this->assertSame(2, DB::table('ai_audit_events')->where('action', 'chat_policy.publish')->count());
    }

    public function test_short_reason_for_member_override_and_credit_adjustment_remains_audited(): void
    {
        $admin = $this->administrator(['ai.view_reports', 'ai.manage_quotas', 'ai.manage_credits']);
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($admin);

        $result = $this->postJson('/admin/ai/chat-limits/overrides', [
            'user_id' => $member->id, 'feature_scope' => 'feature:pmp',
            'max_cycle_tokens' => 80000, 'starts_at_utc' => now()->toISOString(),
            'reason' => 'ok',
        ])->assertCreated();
        $this->postJson('/admin/ai/chat-limits/overrides/'.$result->json('id').'/revoke', [
            'reason' => 'ok',
        ])->assertOk();

        $grant = [
            'user_id' => $member->id, 'credits' => 4,
            'external_reference' => 'g12', 'reason' => 'ok',
        ];
        $this->postJson('/admin/ai/credits/grants', $grant)->assertCreated()
            ->assertJsonPath('created', true);
        $this->postJson('/admin/ai/credits/grants', $grant)->assertOk()
            ->assertJsonPath('created', false);
        $this->assertDatabaseHas('ai_credit_wallets', ['user_id' => $member->id, 'available' => 4]);
        $this->postJson('/admin/ai/credits/grants', [
            ...$grant, 'external_reference' => 'g13', 'reason' => '',
        ])->assertUnprocessable();
        $this->assertSame(1, DB::table('ai_audit_events')->where('action', 'credits.grant')->count());
    }

    public function test_general_ask_ai_policies_cannot_allocate_pmp_only_provider_tokens(): void
    {
        $admin = $this->administrator(['ai.manage_quotas']);
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($admin);
        $policy = [
            'plan_code' => 'plus', 'feature_scope' => 'feature:ask_ai',
            'max_daily' => 10, 'max_cycle' => 20, 'max_per_conversation' => 5,
            'max_concurrent' => 1,
            'active_from_utc' => now()->addMinutes(5)->toISOString(), 'reason' => 'ok',
        ];
        $this->postJson('/admin/ai/chat-limits/policies', [
            ...$policy, 'max_cycle_tokens' => 50000,
        ])->assertUnprocessable();
        $this->postJson('/admin/ai/chat-limits/policies', $policy)->assertCreated();
        $this->postJson('/admin/ai/chat-limits/overrides', [
            'user_id' => $member->id, 'feature_scope' => 'feature:ask_ai',
            'max_cycle_tokens' => 50000, 'starts_at_utc' => now()->toISOString(),
            'reason' => 'ok',
        ])->assertUnprocessable();
    }

    public function test_server_console_permission_provision_is_explicit_and_idempotent(): void
    {
        $admin = $this->administrator([]);
        $this->artisan('pm-ai:authorize-usage-admin', ['email' => $admin->email])->assertExitCode(1);
        $this->artisan('pm-ai:authorize-usage-admin', [
            'email' => $admin->email, '--confirm' => true,
        ])->assertExitCode(0);
        $this->artisan('pm-ai:authorize-usage-admin', [
            'email' => $admin->email, '--confirm' => true,
        ])->assertExitCode(0);
        $this->assertSame(2, DB::table('ai_admin_permissions')->where('user_id', $admin->id)->count());
        $this->assertSame(2, DB::table('ai_audit_events')->where('action', 'permission.grant')->count());
    }
}
