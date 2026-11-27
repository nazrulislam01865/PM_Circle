<?php

namespace Tests\Feature\AI;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AiRefillPackagesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true]);
    }

    private function payload(array $changes = []): array
    {
        return array_replace([
            'code' => 'standard', 'title' => 'Standard pack', 'credits' => 25000,
            'price_minor' => 40000, 'currency' => 'BDT', 'active' => true,
            'expires_after_days' => 90, 'reason' => 'Approved offer', 'replace_id' => null,
        ], $changes);
    }

    public function test_active_verified_admin_can_manage_packages_without_separate_permission(): void
    {
        $this->withoutVite();
        $admin = $this->admin();
        $this->assertDatabaseMissing('ai_admin_permissions', ['user_id' => $admin->id]);
        $this->actingAs($admin)->get('/admin/ai/refill-packages')->assertOk()
            ->assertInertia(fn ($page) => $page->component('admin/AiRefillPackages')->has('packages')->has('providers'));
        $this->getJson('/admin/ai/packages')->assertOk();
        $this->postJson('/admin/ai/packages', $this->payload())->assertCreated();
        $id = DB::table('ai_credit_packages')->where('code', 'standard')->value('id');
        $this->postJson('/admin/ai/packages/'.$id.'/disable', ['reason' => 'Retired offer'])->assertOk();
        $this->assertDatabaseMissing('ai_admin_permissions', ['user_id' => $admin->id]);
        // Catalog access does not imply permission to grant credits or view reconciliation.
        $this->postJson('/admin/ai/credits/grants', [])->assertForbidden();
        $this->getJson('/admin/ai/credits/reconciliation')->assertForbidden();
    }

    public function test_members_and_ineligible_admins_cannot_manage_packages(): void
    {
        $this->withoutVite();
        foreach ([
            User::factory()->create(['is_admin' => false]),
            User::factory()->unverified()->create(['is_admin' => true]),
            User::factory()->create(['is_admin' => true, 'status' => 'suspended']),
        ] as $actor) {
            $this->actingAs($actor);
            $this->get('/admin/ai/refill-packages')->assertForbidden();
            $this->getJson('/admin/ai/packages')->assertForbidden();
            $this->postJson('/admin/ai/packages', $this->payload())->assertForbidden();
            $this->postJson('/admin/ai/packages/1/disable', ['reason' => 'Retired offer'])->assertForbidden();
        }
        $this->assertDatabaseCount('ai_credit_packages', 0);
    }

    public function test_catalog_changes_keep_old_prices_and_allow_only_one_current_offer(): void
    {
        config()->set('pm-ai.purchases_enabled', false);
        $this->actingAs($this->admin())->postJson('/admin/ai/packages', $this->payload())->assertCreated();
        $old = DB::table('ai_credit_packages')->where('code', 'standard')->first();
        $this->postJson('/admin/ai/packages', $this->payload())->assertStatus(409);
        $this->postJson('/admin/ai/packages', $this->payload([
            'price_minor' => 45000, 'replace_id' => $old->id,
        ]))->assertCreated()->assertJsonPath('version', 2);
        $this->assertDatabaseHas('ai_credit_packages', ['id' => $old->id, 'price_minor' => 40000, 'active' => false]);
        $latest = DB::table('ai_credit_packages')->where('code', 'standard')->where('active', true)->sole();
        $this->assertSame(45000, (int) $latest->price_minor);
        $this->postJson('/admin/ai/packages', $this->payload(['replace_id' => $old->id]))->assertStatus(409);
        $this->postJson('/admin/ai/packages/'.$latest->id.'/disable', ['reason' => 'Retired offer'])->assertOk();
        $this->assertDatabaseCount('ai_credit_packages', 2);
        $this->assertSame(0, DB::table('ai_credit_packages')->where('active', true)->count());
        $this->assertSame(3, DB::table('ai_audit_events')->whereIn('action', ['packages.publish', 'packages.disable'])->count());
        $this->actingAs(User::factory()->create(['onboarding_step' => 3]))
            ->getJson(route('billing.ai.packages'))->assertOk()->assertJsonPath('packages', []);
    }

    public function test_invalid_prices_and_foreign_currency_are_rejected(): void
    {
        $this->actingAs($this->admin());
        $this->postJson('/admin/ai/packages', $this->payload(['currency' => 'USD']))->assertUnprocessable();
        $this->postJson('/admin/ai/packages', $this->payload(['price_minor' => 0]))->assertUnprocessable();
        $this->postJson('/admin/ai/packages', $this->payload(['credits' => 0]))->assertUnprocessable();
        $this->assertDatabaseCount('ai_credit_packages', 0);
    }
}
