<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiFeatureRouting;
use App\Domain\AI\Services\FeatureConnectionStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class WorkspaceConnectionSelectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_workspace_selection_resolves_without_environment_key_and_preserves_budget(): void
    {
        config()->set(['pm-ai.enabled' => true, 'pm-ai.editorial_enabled' => true, 'pm-ai.daily_challenge_api_key' => null, 'pm-ai.allowed_models' => ['gpt-5-nano']]);
        DB::table('ai_features')->insert(['code' => 'scenario_generate', 'enabled' => true, 'model' => 'gpt-5-nano', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('ai_model_prices')->insert(['model' => 'gpt-5-nano', 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => .1, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        $provider = DB::table('ai_workspace_providers')->where('adapter', 'openai')->where('is_default', true)->value('id');
        $id = DB::table('ai_workspace_credentials')->insertGetId(['slot' => 'daily_challenge_api_key', 'name' => 'Daily selected', 'secret_encrypted' => Crypt::encryptString('synthetic-private-secret'), 'suffix' => 'cret', 'enabled' => true, 'provider_id' => $provider, 'health_code' => 'OPERATION_VERIFIED', 'checked_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('ai_workspace_feature_routes')->insert(['feature_code' => 'scenario_generate', 'strategy' => 'primary_only', 'daily_usd' => 1.25, 'created_at' => now(), 'updated_at' => now()]);
        $admin = User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now()]);
        $url = '/admin/ai/workspace/connection/scenario_generate';
        $this->actingAs($admin)->getJson($url)->assertOk()->assertJsonPath('selected', 'default')->assertJsonPath('credentials.0.id', (string) $id)->assertDontSee('synthetic-private-secret');
        $data = ['credential_id' => $id, 'expected' => 'default', 'primary_model' => 'gpt-5-nano', 'expected_model' => 'gpt-5-nano'];
        $this->putJson($url, $data)->assertOk();
        $this->assertDatabaseHas('ai_workspace_feature_routes', ['feature_code' => 'scenario_generate', 'primary_credential_id' => $id, 'daily_usd' => 1.25]);
        app(AiFeatureRouting::class)->forget();
        $status = app(FeatureConnectionStatus::class)->status('daily-challenge', 'gpt-5-nano');
        $this->assertTrue($status['configured']);
        $this->assertSame('Daily selected', $status['credential_name']);
        $this->assertSame('OPERATION_VERIFIED', $status['credential_health_code']);
        $this->assertFalse($status['connected']); // Credential check is not a full feature test.
        $this->putJson($url, $data)->assertConflict();
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($member)->getJson($url)->assertForbidden();
        $this->putJson($url, $data)->assertForbidden();
    }
}
