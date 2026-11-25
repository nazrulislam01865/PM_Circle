<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiRuntimeSettings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class AiWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private const BASE = '/admin/ai/workspace';

    private function administrator(): User
    {
        return User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now()]);
    }

    private function configureCredentialDiagnostic(): void
    {
        config()->set([
            'pm-ai.allowed_models' => ['gpt-5-nano'],
            'pm-ai.global_daily_budget_usd' => 10,
            'pm-ai.editorial_budget_usd' => 5,
        ]);
        DB::table('ai_features')->insert(['code' => 'pmp_explain', 'enabled' => true, 'model' => 'gpt-5-nano', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('ai_model_prices')->insert(['model' => 'gpt-5-nano', 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => .1, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        Http::preventStrayRequests();
    }

    private function diagnosticResponse(): array
    {
        return ['status' => 'completed', 'output' => [['content' => [['type' => 'output_text', 'text' => 'OK']]]], 'usage' => ['input_tokens' => 10, 'output_tokens' => 5]];
    }

    public function test_workspace_sections_are_admin_only_and_do_not_need_separate_feature_permission(): void
    {
        $this->withoutVite();
        $admin = $this->administrator();
        foreach (\App\Http\Controllers\Admin\AI\AiWorkspaceController::PAGES as $section) {
            $this->actingAs($admin)->get(self::BASE.'/'.$section)->assertOk();
        }
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($member)->get(self::BASE.'/overview')->assertForbidden();
        $this->postJson(self::BASE.'/credentials', [])->assertForbidden();
    }

    public function test_credentials_are_encrypted_tested_and_activated_only_in_the_compatible_slot(): void
    {
        $this->withoutVite();
        config()->set('pm-ai.api_key', 'environment-test-key');
        Http::preventStrayRequests();
        $this->configureCredentialDiagnostic();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->diagnosticResponse(), 200)]);
        $secret = 'synthetic-credential-secret';
        $admin = $this->administrator();
        $this->actingAs($admin)->postJson(self::BASE.'/credentials', ['slot' => 'api_key', 'name' => 'Replacement', 'enabled' => true, 'secret' => $secret])->assertOk();
        $row = DB::table('ai_workspace_credentials')->first();
        $this->assertNotSame($secret, $row->secret_encrypted);
        $this->assertSame($secret, Crypt::decryptString($row->secret_encrypted));
        $this->assertSame('environment-test-key', app(AiRuntimeSettings::class)->credential('api_key'));
        $this->get(self::BASE.'/keys')->assertOk()->assertDontSee($secret)->assertDontSee($row->secret_encrypted);
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'api_key', 'id' => $row->id])->assertUnprocessable();
        $this->postJson(self::BASE.'/credentials/'.$row->id.'/test')->assertOk()->assertJsonPath('code', 'OPERATION_VERIFIED');
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer '.$secret));
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'daily_challenge_api_key', 'id' => $row->id])->assertUnprocessable();
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'api_key', 'id' => $row->id])->assertOk();
        $this->assertSame($secret, app(AiRuntimeSettings::class)->credential('api_key'));
        $this->putJson(self::BASE.'/credentials/'.$row->id, ['slot' => 'api_key', 'name' => 'Replacement', 'enabled' => false])->assertUnprocessable();
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'api_key', 'id' => null])->assertOk();
        $this->assertSame('environment-test-key', app(AiRuntimeSettings::class)->credential('api_key'));
        $this->assertDatabaseHas('ai_audit_events', ['action' => 'credential.activate']);
    }

    public function test_failed_rotation_does_not_replace_saved_secret(): void
    {
        Http::preventStrayRequests();
        $this->configureCredentialDiagnostic();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response(['error' => ['code' => 'invalid_api_key']], 401)]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/credentials', ['slot' => 'api_key', 'name' => 'Primary', 'enabled' => true, 'secret' => 'original-synthetic-key'])->assertOk();
        $row = DB::table('ai_workspace_credentials')->first();
        $this->postJson(self::BASE.'/credentials/'.$row->id.'/rotate', ['secret' => 'replacement-synthetic-key'])->assertUnprocessable();
        $this->assertSame($row->secret_encrypted, DB::table('ai_workspace_credentials')->where('id', $row->id)->value('secret_encrypted'));
    }

    public function test_model_registry_is_additive_and_budget_preserves_separate_financial_authorization(): void
    {
        $admin = $this->administrator();
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
        config()->set('pm-ai.global_daily_budget_usd', 5);
        $this->actingAs($admin)->postJson(self::BASE.'/models', ['name' => 'Approved test model', 'code' => 'gpt-test-model', 'enabled' => true])->assertOk();
        $this->assertContains('gpt-test-model', app(AiRuntimeSettings::class)->allowedModels());
        $this->assertContains('gpt-5-nano', app(AiRuntimeSettings::class)->allowedModels());
        $data = ['scope' => 'global_daily_budget_usd', 'daily_usd' => 3];
        $this->putJson(self::BASE.'/budget', $data)->assertForbidden();
        DB::table('ai_admin_permissions')->insert(['user_id' => $admin->id, 'permission' => 'ai.manage_quotas', 'created_at' => now()]);
        $this->putJson(self::BASE.'/budget', $data)->assertOk();
        $this->assertSame(3.0, app(AiRuntimeSettings::class)->budget('global_daily_budget_usd'));
    }
    public function test_provider_registry_profiles_are_persisted_and_cannot_disable_active_routes(): void
    {
        $this->withoutVite();
        $admin = $this->administrator();
        $this->actingAs($admin)->postJson(self::BASE.'/providers', ['name' => 'Secondary account', 'adapter' => 'openai', 'status' => 'Active'])->assertOk();
        $profile = DB::table('ai_workspace_providers')->where('name', 'Secondary account')->first();
        $this->assertNotNull($profile);
        $this->get(self::BASE.'/providers')->assertOk()->assertSee('Secondary account');
        $this->postJson(self::BASE.'/providers', ['name' => 'Claude account', 'adapter' => 'anthropic', 'status' => 'Active'])->assertOk();
        $this->postJson(self::BASE.'/providers', ['name' => 'Unknown', 'adapter' => 'http://localhost', 'status' => 'Active'])->assertUnprocessable();
        $this->postJson(self::BASE.'/credentials', ['name' => 'Mismatch', 'slot' => 'gemini_api_key', 'provider_id' => $profile->id, 'enabled' => true, 'secret' => 'synthetic-credential-secret'])->assertUnprocessable();
        $this->postJson(self::BASE.'/credentials', ['name' => 'Secondary key', 'slot' => 'api_key', 'provider_id' => $profile->id, 'enabled' => true, 'secret' => 'synthetic-credential-secret', 'priority' => 2])->assertOk();
        $key = DB::table('ai_workspace_credentials')->where('provider_id', $profile->id)->first();
        $this->assertSame(2, (int) $key->priority);
        Http::preventStrayRequests();
        $this->configureCredentialDiagnostic();
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->diagnosticResponse(), 200)]);
        $this->postJson(self::BASE.'/credentials/'.$key->id.'/test')->assertOk();
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'api_key', 'id' => $key->id])->assertOk();
        $this->putJson(self::BASE.'/providers/'.$profile->id, ['name' => 'Secondary account', 'adapter' => 'openai', 'status' => 'Disabled'])->assertUnprocessable();
        $this->assertSame('synthetic-credential-secret', app(AiRuntimeSettings::class)->credential('api_key'));
        $this->assertDatabaseHas('ai_audit_events', ['action' => 'provider.configuration.save']);
        $this->actingAs(User::factory()->create(['is_admin' => false]))->postJson(self::BASE.'/providers', ['name' => 'Forbidden', 'adapter' => 'openai', 'status' => 'Active'])->assertForbidden();
    }

    public function test_credential_budget_requires_financial_permission_and_preserves_priority(): void
    {
        $admin = $this->administrator();
        $data = ['name' => 'Budgeted credential', 'slot' => 'api_key', 'enabled' => true, 'priority' => 3, 'daily_budget_usd' => 2.5, 'secret' => 'synthetic-credential-secret'];
        $this->actingAs($admin)->postJson(self::BASE.'/credentials', $data)->assertForbidden();
        DB::table('ai_admin_permissions')->insert(['user_id' => $admin->id, 'permission' => 'ai.manage_quotas', 'created_at' => now()]);
        $this->postJson(self::BASE.'/credentials', $data)->assertOk();
        $row = DB::table('ai_workspace_credentials')->where('name', $data['name'])->first();
        $this->assertSame(2.5, (float) $row->daily_budget_usd);
        $this->assertSame(3, (int) $row->priority);
        $this->putJson(self::BASE.'/credentials/'.$row->id, ['name' => $row->name, 'slot' => $row->slot, 'enabled' => true, 'priority' => 4])->assertOk();
        $this->assertSame(2.5, (float) DB::table('ai_workspace_credentials')->where('id', $row->id)->value('daily_budget_usd'));
    }
    public function test_credential_reservation_reuses_global_hold_and_reconciles_actual_cost(): void
    {
        $request = DB::table('ai_requests')->insertGetId([
            'request_uuid' => (string) \Illuminate\Support\Str::uuid(), 'feature_code' => 'pmp_explain',
            'status' => 'running', 'model' => 'gpt-5-nano', 'payload_encrypted' => Crypt::encryptString('{}'),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $day = now('UTC')->toDateString();
        $global = DB::table('ai_budget_usage')->insertGetId(['scope' => 'global', 'utc_day' => $day, 'reserved_usd' => .25, 'spent_usd' => 0]);
        DB::table('ai_request_budget_allocations')->insert(['request_id' => $request, 'bucket_id' => $global, 'reserved_usd' => .25]);
        $budget = app(\App\Domain\AI\Services\AiBudgetService::class);
        $ref = 'credential:env:api_key';
        try {
            $budget->reserveCredential($request, ['ref' => $ref, 'limit' => .10]);
            $this->fail('Budgeted credential must reject an excessive hold.');
        } catch (\App\Domain\AI\Support\AiFailure $failure) {
            $this->assertSame('DAILY_AI_BUDGET_REACHED', $failure->safeCode);
        }
        $this->assertDatabaseMissing('ai_budget_usage', ['scope' => $ref]);
        $budget->reserveCredential($request, ['ref' => $ref, 'limit' => .50]);
        $this->assertSame(.25, (float) DB::table('ai_budget_usage')->where('scope', $ref)->value('reserved_usd'));
        DB::transaction(fn () => $budget->finish($request, '0.100000000'));
        $this->assertSame(.10, (float) DB::table('ai_budget_usage')->where('scope', $ref)->value('spent_usd'));
        $this->assertSame(0.0, (float) DB::table('ai_budget_usage')->where('scope', $ref)->value('reserved_usd'));
        $this->assertSame(0, DB::table('ai_request_budget_allocations')->where('request_id', $request)->where('finalized', false)->count());
    }
    public function test_custom_pool_label_does_not_change_the_internal_route(): void
    {
        $this->withoutVite();
        config()->set('pm-ai.api_key', 'environment-test-key');
        $this->actingAs($this->administrator())->postJson(self::BASE.'/credentials', [
            'name' => 'Custom pool key', 'slot' => 'api_key', 'pool_label' => 'My PMP team',
            'enabled' => true, 'secret' => 'synthetic-key-for-test',
        ])->assertOk();
        $row = DB::table('ai_workspace_credentials')->where('name', 'Custom pool key')->first();
        $this->assertSame('My PMP team', $row->pool_label);
        $this->putJson(self::BASE.'/credentials/'.$row->id, [
            'name' => 'Custom pool key', 'slot' => 'api_key', 'pool_label' => 'New custom label', 'enabled' => true,
        ])->assertOk();
        $this->assertDatabaseHas('ai_workspace_credentials', ['id' => $row->id, 'slot' => 'api_key', 'pool_label' => 'New custom label']);
        $this->get(self::BASE.'/keys')->assertOk()->assertSee('New custom label');
        $this->assertSame('environment-test-key', app(AiRuntimeSettings::class)->credential('api_key'));
    }

    public function test_environment_edit_and_rotation_create_safe_managed_credentials(): void
    {
        $this->withoutVite();
        config()->set('pm-ai.api_key', 'original-environment-secret');
        Http::preventStrayRequests();
        $this->configureCredentialDiagnostic();
        Http::fake(['https://api.openai.com/v1/responses' => Http::sequence()->push(['error' => ['code' => 'invalid_api_key']], 401)->push($this->diagnosticResponse(), 200)]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/credentials', [
            'name' => 'Managed environment copy', 'slot' => 'api_key', 'pool_label' => 'Interactive team', 'enabled' => true,
            'import_environment' => true,
        ])->assertOk();
        $copy = DB::table('ai_workspace_credentials')->where('name', 'Managed environment copy')->first();
        $this->assertSame('original-environment-secret', Crypt::decryptString($copy->secret_encrypted));
        $this->postJson(self::BASE.'/environment/api_key/rotate', ['name' => 'Replacement', 'secret' => 'new-synthetic-secret'])->assertUnprocessable();
        $this->assertDatabaseMissing('ai_workspace_credentials', ['name' => 'Replacement']);
        $this->postJson(self::BASE.'/environment/api_key/rotate', ['name' => 'Replacement', 'secret' => 'new-synthetic-secret'])->assertOk();
        $replacement = DB::table('ai_workspace_credentials')->where('name', 'Replacement')->first();
        $this->assertSame('OPERATION_VERIFIED', $replacement->health_code);
        $this->assertSame('original-environment-secret', app(AiRuntimeSettings::class)->credential('api_key'));
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'api_key', 'id' => $replacement->id])->assertOk();
        $this->assertSame('new-synthetic-secret', app(AiRuntimeSettings::class)->credential('api_key'));
        $this->get(self::BASE.'/keys')->assertOk()->assertDontSee('original-environment-secret')->assertDontSee('new-synthetic-secret');
        $this->assertDatabaseHas('ai_audit_events', ['action' => 'credential.rotate', 'subject_id' => $replacement->id]);
    }

    public function test_model_capability_must_match_implemented_model(): void
    {
        $this->actingAs($this->administrator())->postJson(self::BASE.'/models', [
            'name' => 'Incompatible', 'code' => 'gpt-test-model', 'provider' => 'openai', 'capability' => 'Moderation', 'enabled' => true,
        ])->assertUnprocessable();
        $this->postJson(self::BASE.'/models', [
            'name' => 'Generation', 'code' => 'gpt-test-model', 'provider' => 'openai', 'capability' => 'Text generation', 'enabled' => true,
        ])->assertOk();
    }
    public function test_daily_key_test_uses_actual_responses_permission_and_never_checks_model_list(): void
    {
        $this->configureCredentialDiagnostic();
        config()->set('pm-ai.daily_challenge_api_key', 'working-daily-key');
        Http::fake([
            'https://api.openai.com/v1/models*' => Http::response(['error' => ['code' => 'missing_scope']], 403),
            'https://api.openai.com/v1/responses' => Http::response($this->diagnosticResponse()),
        ]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/environment/daily_challenge_api_key/test')
            ->assertOk()->assertJsonPath('code', 'OPERATION_VERIFIED')->assertDontSee('working-daily-key');
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => $request->method() === 'POST' && str_ends_with($request->url(), '/responses') && $request->hasHeader('Authorization', 'Bearer working-daily-key') && $request['model'] === 'gpt-5-nano');
        $this->assertDatabaseHas('ai_requests', ['feature_code' => 'scenario_generate', 'subject_type' => 'workspace_credential_test', 'credential_ref' => 'credential:env:daily_challenge_api_key', 'status' => 'completed', 'cost_usd' => .00002]);
        $this->assertDatabaseCount('ai_editorial_drafts', 0);
    }

    public function test_scope_denied_is_distinguished_and_budget_denial_never_dispatches(): void
    {
        $this->configureCredentialDiagnostic();
        config()->set('pm-ai.daily_challenge_api_key', 'working-daily-key');
        Http::fake(['https://api.openai.com/v1/responses' => Http::response(['error' => ['code' => 'missing_scope']], 401)]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/environment/daily_challenge_api_key/test')
            ->assertOk()->assertJsonPath('code', 'PROVIDER_PERMISSION_DENIED');
        config()->set('pm-ai.global_daily_budget_usd', 0);
        app(AiRuntimeSettings::class)->forget();
        $this->postJson(self::BASE.'/environment/daily_challenge_api_key/test')->assertOk()->assertJsonPath('code', 'BUDGET_NOT_CONFIGURED');
        Http::assertSentCount(1);
    }

    public function test_unknown_diagnostic_preserves_reservation_and_blocks_duplicate(): void
    {
        $this->configureCredentialDiagnostic();
        config()->set('pm-ai.daily_challenge_api_key', 'working-daily-key');
        Http::fake(['https://api.openai.com/v1/responses' => Http::response([], 503)]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/environment/daily_challenge_api_key/test')->assertOk()->assertJsonPath('code', 'PROVIDER_STATUS_UNKNOWN');
        $this->postJson(self::BASE.'/environment/daily_challenge_api_key/test')->assertOk()->assertJsonPath('code', 'PROVIDER_STATUS_UNKNOWN');
        Http::assertSentCount(1);
        $this->assertDatabaseHas('ai_requests', ['subject_type' => 'workspace_credential_test', 'status' => 'provider_status_unknown']);
        $this->assertGreaterThan(0, (float) DB::table('ai_budget_usage')->where('scope', 'global')->value('reserved_usd'));
    }

    public function test_old_model_list_success_does_not_authorize_activation(): void
    {
        $this->actingAs($this->administrator())->postJson(self::BASE.'/credentials', ['slot' => 'daily_challenge_api_key', 'name' => 'Old tested key', 'enabled' => true, 'secret' => 'synthetic-old-key'])->assertOk();
        $id = DB::table('ai_workspace_credentials')->where('name', 'Old tested key')->value('id');
        DB::table('ai_workspace_credentials')->where('id', $id)->update(['health_code' => 'ACCESS_VERIFIED', 'checked_at' => now()]);
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'daily_challenge_api_key', 'id' => $id])->assertUnprocessable();
    }

    public function test_daily_rotation_uses_candidate_secret_then_activation_changes_feature_route(): void
    {
        $this->configureCredentialDiagnostic();
        config()->set('pm-ai.daily_challenge_api_key', 'original-daily-secret');
        Http::fake(['https://api.openai.com/v1/responses' => Http::response($this->diagnosticResponse())]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/environment/daily_challenge_api_key/rotate', [
            'name' => 'New Daily Challenge', 'secret' => 'replacement-daily-secret',
        ])->assertOk();
        $row = DB::table('ai_workspace_credentials')->where('name', 'New Daily Challenge')->first();
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer replacement-daily-secret'));
        $routing = app(\App\Domain\AI\Services\AiFeatureRouting::class);
        $this->assertSame('original-daily-secret', $routing->primarySecret('scenario_generate', 'daily_challenge_api_key'));
        $this->postJson(self::BASE.'/credentials/activate', ['slot' => 'daily_challenge_api_key', 'id' => $row->id])->assertOk();
        $this->assertSame('replacement-daily-secret', $routing->primarySecret('scenario_generate', 'daily_challenge_api_key'));
        $this->assertSame('replacement-daily-secret', $routing->primarySecret('daily_challenge_review', 'daily_challenge_api_key'));
    }

    public function test_gemini_and_anthropic_use_generation_endpoints_with_correct_provider_accounting(): void
    {
        $this->configureCredentialDiagnostic();
        config()->set(['pm-ai.gemini_api_key' => 'synthetic-gemini-secret', 'pm-ai.gemini_trend_model' => 'gemini-test', 'pm-ai.anthropic_api_key' => 'synthetic-claude-secret']);
        DB::table('ai_workspace_models')->insert(['name' => 'Claude test', 'code' => 'claude-test', 'enabled' => true, 'availability' => 'Active', 'capability' => 'Text generation', 'created_at' => now(), 'updated_at' => now()]);
        foreach (['gemini-test', 'claude-test'] as $model) DB::table('ai_model_prices')->insert(['model' => $model, 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => .1, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        Http::fake([
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent' => Http::response(['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['text' => 'OK']]]]], 'usageMetadata' => ['promptTokenCount' => 10, 'candidatesTokenCount' => 5, 'thoughtsTokenCount' => 2]]),
            'https://api.anthropic.com/v1/messages' => Http::response(['stop_reason' => 'end_turn', 'content' => [['type' => 'text', 'text' => 'OK']], 'usage' => ['input_tokens' => 10, 'output_tokens' => 5]]),
        ]);
        $this->actingAs($this->administrator())->postJson(self::BASE.'/environment/gemini_api_key/test')->assertOk()->assertJsonPath('code', 'OPERATION_VERIFIED');
        $this->postJson(self::BASE.'/environment/anthropic_api_key/test')->assertOk()->assertJsonPath('code', 'OPERATION_VERIFIED');
        Http::assertSentCount(2);
        $this->assertDatabaseHas('ai_requests', ['provider' => 'gemini', 'output_tokens' => 7, 'subject_type' => 'workspace_credential_test']);
        $this->assertDatabaseHas('ai_requests', ['provider' => 'anthropic', 'output_tokens' => 5, 'subject_type' => 'workspace_credential_test']);
    }

}
