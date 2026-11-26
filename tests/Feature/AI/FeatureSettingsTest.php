<?php

namespace Tests\Feature\AI;

use App\Models\User;
use App\Domain\AI\Services\AiExecutionService;
use App\Domain\AI\Services\FeatureConnectionStatus;
use Illuminate\Support\Facades\Queue;
use App\Services\Exam\PmpExamSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class FeatureSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now()]);
        return $admin;
    }

    public function test_feed_settings_allow_admin_without_extra_permission_and_preserve_default(): void
    {
        $url = '/admin/ai/feed-moderation';
        $member = User::factory()->create(['is_admin' => false]);
        $this->assertFalse((bool) DB::table('feed_moderation_settings')->where('id', 1)->value('hold_clean_content'));
        $this->actingAs($member)->put($url, ['hold_clean_content' => true])->assertForbidden();
        $this->actingAs($this->admin())->from($url)->put($url, ['hold_clean_content' => true])->assertRedirect($url);
        $this->assertTrue((bool) DB::table('feed_moderation_settings')->where('id', 1)->value('hold_clean_content'));
        $this->assertDatabaseHas('ai_audit_events', ['action' => 'feed_moderation.settings.update']);
        $this->putJson($url, ['hold_clean_content' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('hold_clean_content');
    }

    public function test_settings_pages_and_actions_require_only_an_active_verified_admin(): void
    {
        $this->withoutVite();
        $pages = ['/admin/ai/pmp-settings', '/admin/ai/feed-moderation', '/admin/ai/daily-challenge', '/admin/ai/career-trends'];
        $admin = $this->admin();
        $this->assertDatabaseMissing('ai_admin_permissions', ['user_id' => $admin->id]);
        foreach ($pages as $url) {
            $this->actingAs($admin)->get($url)->assertOk();
        }
        foreach ([
            User::factory()->create(['is_admin' => false]),
            User::factory()->unverified()->create(['is_admin' => true]),
            User::factory()->create(['is_admin' => true, 'status' => 'suspended']),
        ] as $actor) {
            // Even historical grants cannot bypass administrator account checks.
            DB::table('ai_admin_permissions')->insert(['user_id' => $actor->id, 'permission' => 'ai.manage_features', 'created_at' => now()]);
            $this->actingAs($actor);
            foreach ($pages as $url) {
                $this->get($url)->assertForbidden();
                $this->putJson($url, [])->assertForbidden();
            }
            foreach (['pmp', 'feed-moderation', 'daily-challenge'] as $feature) {
                $this->postJson('/admin/ai/feature-connection/'.$feature)->assertForbidden();
            }
            $this->postJson('/admin/ai/feed-moderation/test')->assertForbidden();
            $this->postJson('/admin/ai/daily-challenge/generate')->assertForbidden();
        }
    }

    public function test_pmp_ai_update_never_changes_exam_configuration_or_usage_limits(): void
    {
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(0);
        $examBefore = app(PmpExamSettings::class)->get();
        $limitsBefore = DB::table('ai_chat_limit_policies')->orderBy('id')->get()->toArray();
        $featuresBefore = DB::table('ai_features')->where('code', 'pmp_explain')->first();
        $url = '/admin/ai/pmp-settings';
        $this->actingAs($this->admin())->from($url)->put($url, ['features' => [
            'pmp_explain' => ['enabled' => true, 'model' => 'gpt-5-nano'],
            'pmp_followup' => ['enabled' => false, 'model' => 'gpt-5-nano'],
        ], 'full_question_count' => 1, 'credit_tariff' => 900])->assertRedirect($url);
        $this->assertSame($examBefore, app(PmpExamSettings::class)->get());
        $this->assertEquals($limitsBefore, DB::table('ai_chat_limit_policies')->orderBy('id')->get()->toArray());
        $this->assertSame((int) $featuresBefore->credit_tariff, (int) DB::table('ai_features')->where('code', 'pmp_explain')->value('credit_tariff'));
        $this->assertFalse((bool) DB::table('ai_features')->where('code', 'pmp_followup')->value('enabled'));
        $this->assertDatabaseHas('ai_audit_events', ['action' => 'pmp_ai.settings.update']);
        $this->putJson($url, ['features' => [
            'pmp_explain' => ['enabled' => false, 'model' => 'gpt-5-nano'],
            'pmp_followup' => ['enabled' => true, 'model' => 'gpt-5-nano'],
        ]])->assertUnprocessable()->assertJsonValidationErrors('features.pmp_followup.enabled');
    }

    private function configureGenerationDiagnostic(): void
    {
        Queue::fake();
        config()->set([
            'pm-ai.enabled' => true, 'pm-ai.editorial_enabled' => true,
            'pm-ai.allowed_models' => ['gpt-5-nano'], 'pm-ai.api_key' => 'synthetic-pmp-secret',
            'pm-ai.daily_challenge_api_key' => 'synthetic-daily-secret', 'pm-ai.post_check_api_key' => 'synthetic-moderation-secret',
            'pm-ai.daily_challenge_skip_generation_moderation' => false, 'pm-ai.pmp_external_moderation' => false,
            'pm-ai.global_daily_budget_usd' => 10, 'pm-ai.editorial_budget_usd' => 5,
        ]);
        foreach (['scenario_generate', 'pmp_explain'] as $code) {
            DB::table('ai_features')->insert(['code' => $code, 'enabled' => true, 'model' => 'gpt-5-nano', 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('ai_model_prices')->insert(['model' => 'gpt-5-nano', 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 0.1, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        Http::preventStrayRequests();
    }

    public function test_daily_and_pmp_connection_use_real_generation_with_dedicated_keys_and_metering(): void
    {
        $this->configureGenerationDiagnostic();
        $daily = ['title' => 'Test', 'summary' => 'Test', 'situation' => 'Test', 'known_facts' => ['One', 'Two'],
            'topics' => ['Schedule'], 'difficulty' => 'Moderate', 'focus' => 'Test', 'learner_prompt' => 'Test',
            'rubric_criteria' => [['key' => 'a', 'description' => 'Test', 'max_points' => 5], ['key' => 'b', 'description' => 'Test', 'max_points' => 5]]];
        Http::fake(function ($request) use ($daily) {
            if (str_ends_with($request->url(), '/moderations')) return Http::response(['results' => [['flagged' => false]]]);
            $payload = $request->hasHeader('Authorization', 'Bearer synthetic-daily-secret') ? $daily : ['explanation' => 'Test', 'nextStep' => null];
            return Http::response(['id' => 'test-response', 'status' => 'completed', 'output' => [['content' => [['type' => 'output_text', 'text' => json_encode($payload)]]]], 'usage' => ['input_tokens' => 50, 'output_tokens' => 30]]);
        });
        $admin = $this->admin();
        $this->actingAs($admin);
        $pmpBefore = app(PmpExamSettings::class)->get();
        foreach (['daily-challenge', 'pmp'] as $feature) {
            $url = '/admin/ai/feature-connection/'.$feature;
            $receipt = $this->postJson($url)->assertOk()->assertJsonPath('pending', true)->assertDontSee('synthetic-daily-secret')->json();
            $this->postJson($url)->assertJsonPath('request_id', $receipt['request_id']);
            $row = DB::table('ai_requests')->where('request_uuid', $receipt['request_id'])->first();
            $this->assertNull($row->user_id);
            $this->assertDatabaseHas('ai_request_budget_allocations', ['request_id' => $row->id, 'finalized' => false]);
            app(AiExecutionService::class)->execute($row->id);
            $this->getJson($url.'/'.$receipt['request_id'])->assertOk()->assertJsonPath('connected', true)->assertJsonPath('verification', 'generation');
            $this->assertDatabaseHas('ai_requests', ['id' => $row->id, 'status' => 'completed', 'final_charge' => 0]);
            $this->assertDatabaseHas('ai_request_budget_allocations', ['request_id' => $row->id, 'finalized' => true]);
            $this->assertTrue(app(FeatureConnectionStatus::class)->status($feature, 'gpt-5-nano')['connected']);
            $this->actingAs($this->admin())->getJson($url.'/'.$receipt['request_id'])->assertNotFound();
            $this->actingAs($admin);
        }
        $this->assertSame($pmpBefore, app(PmpExamSettings::class)->get());
        $this->assertDatabaseCount('ai_editorial_drafts', 0);
        $this->assertDatabaseCount('pmp_exam_attempts', 0);
        Http::assertSentCount(4);
        foreach (['synthetic-daily-secret', 'synthetic-pmp-secret'] as $key) {
            Http::assertSent(fn ($request) => str_ends_with($request->url(), '/responses') && $request->hasHeader('Authorization', 'Bearer '.$key));
        }
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/moderations') && $request->hasHeader('Authorization', 'Bearer synthetic-moderation-secret'));
    }

    public function test_shared_openai_primary_can_be_assigned_to_daily_operations_and_diagnostics_use_that_key(): void
    {
        $this->configureGenerationDiagnostic();
        config()->set('pm-ai.daily_challenge_api_key', null);
        DB::table('ai_features')->updateOrInsert(['code' => 'daily_challenge_review'], ['enabled' => true, 'model' => 'gpt-5-nano', 'created_at' => now(), 'updated_at' => now()]);
        $provider = DB::table('ai_workspace_providers')->where('adapter', 'openai')->where('is_default', true)->value('id');
        $key = DB::table('ai_workspace_credentials')->insertGetId([
            'slot' => 'api_key', 'provider_id' => $provider, 'name' => 'Shared Responses', 'suffix' => 'cret', 'secret_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString('synthetic-shared-secret'),
            'enabled' => true, 'health_code' => 'OPERATION_VERIFIED', 'checked_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $moderation = DB::table('ai_workspace_credentials')->insertGetId([
            'slot' => 'post_check_api_key', 'provider_id' => $provider, 'name' => 'Isolated moderation', 'suffix' => 'cret', 'secret_encrypted' => \Illuminate\Support\Facades\Crypt::encryptString('synthetic-isolated-secret'),
            'enabled' => true, 'health_code' => 'OPERATION_VERIFIED', 'checked_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->actingAs($this->admin());
        $routing = app(\App\Domain\AI\Services\AiFeatureRouting::class);
        $this->assertFalse($routing->primaryConfigured('scenario_generate', 'daily_challenge_api_key'));
        $results = [
            'scenario_generate' => ['title' => 'Test', 'summary' => 'Test', 'situation' => 'Test', 'known_facts' => ['One', 'Two'], 'topics' => ['Schedule'], 'difficulty' => 'Moderate', 'focus' => 'Test', 'learner_prompt' => 'Test', 'rubric_criteria' => [['key' => 'a', 'description' => 'Test', 'max_points' => 5], ['key' => 'b', 'description' => 'Test', 'max_points' => 5]]],
            'daily_challenge_review' => ['criteria' => [['key' => 'risk', 'points' => 10, 'evidence' => 'Risk identified']], 'strengths' => ['Risk owner'], 'gaps' => ['Add details'], 'next_actions' => ['Track risk'], 'disclaimer' => 'Educational'],
        ];
        $payload = [];
        Http::fake(function ($request) use (&$payload) {
            if (str_ends_with($request->url(), '/moderations')) return Http::response(['results' => [['flagged' => false]]]);
            return Http::response(['id' => 'test-shared', 'status' => 'completed', 'output' => [['content' => [['type' => 'output_text', 'text' => json_encode($payload)]]]], 'usage' => ['input_tokens' => 50, 'output_tokens' => 30]]);
        });
        foreach ($results as $operation => $payload) {
            $url = '/admin/ai/workspace/connection/'.$operation;
            $options = $this->getJson($url)->assertOk()->assertJsonPath('default_name', null)->assertJsonPath('credentials.0.id', (string) $key)->assertJsonPath('credentials.0.shared', true)->assertDontSee('synthetic-shared-secret')->json();
            $this->assertNotContains((string) $moderation, array_column($options['credentials'], 'id'));
            $data = ['credential_id' => $key, 'expected' => 'default', 'primary_model' => 'gpt-5-nano', 'expected_model' => 'gpt-5-nano'];
            $this->putJson($url, [...$data, 'credential_id' => $moderation])->assertUnprocessable();
            $this->putJson($url, $data)->assertOk();
            $this->getJson($url)->assertOk()->assertJsonPath('connection.configured', true)->assertJsonPath('connection.connected', false);
            $diagnostic = '/admin/ai/feature-connection/'.($operation === 'scenario_generate' ? 'daily-challenge' : 'daily-challenge-review');
            $receipt = $this->postJson($diagnostic)->assertOk()->assertJsonPath('pending', true)->json();
            $row = DB::table('ai_requests')->where('request_uuid', $receipt['request_id'])->first();
            $this->assertNull($row->user_id);
            $snapshot = json_decode($row->routing_snapshot, true);
            $this->assertSame('daily_challenge_api_key', $snapshot[0]['slot']);
            $this->assertSame($key, $snapshot[0]['id']);
            app(AiExecutionService::class)->execute($row->id);
            $this->getJson($diagnostic.'/'.$receipt['request_id'])->assertOk()->assertJsonPath('connected', true);
            $this->assertDatabaseHas('ai_requests', ['id' => $row->id, 'credential_ref' => 'credential:'.$key, 'status' => 'completed', 'final_charge' => 0]);
        }
        $this->assertDatabaseHas('ai_workspace_credentials', ['id' => $key, 'slot' => 'api_key']);
        $this->assertDatabaseCount('ai_editorial_drafts', 0);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/responses') && $request->hasHeader('Authorization', 'Bearer synthetic-shared-secret'));
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/moderations') && $request->hasHeader('Authorization', 'Bearer synthetic-moderation-secret'));
    }

    public function test_career_review_diagnostics_use_synthetic_data_and_do_not_charge_members(): void
    {
        $this->configureGenerationDiagnostic();
        $results = [
            'resume_analyze' => ['strengths' => ['Clear experience'], 'improvements' => ['Add detail'], 'role_alignment' => 'Relevant', 'disclaimer' => 'Educational'],
            'resume_rewrite' => ['suggested_text' => 'Coordinated project risk reviews.', 'reason' => 'Concise wording'],
            'interview_answer_review' => ['summary' => 'Clear approach', 'strengths' => ['Risk owner'], 'improvements' => ['Add outcome'], 'suggested_answer' => 'Track risk mitigation.'],
        ];
        $payload = [];
        Http::fake(function ($request) use (&$payload) {
            if (str_ends_with($request->url(), '/moderations')) return Http::response(['results' => [['flagged' => false]]]);
            return Http::response(['id' => 'synthetic-review', 'status' => 'completed', 'output' => [['content' => [['type' => 'output_text', 'text' => json_encode($payload)]]]], 'usage' => ['input_tokens' => 50, 'output_tokens' => 30]]);
        });
        foreach ($results as $code => $result) {
            $payload = $result;
            DB::table('ai_features')->where('code', $code)->update(['enabled' => true, 'model' => 'gpt-5-nano']);
            $url = '/admin/ai/feature-connection/'.$code;
            $receipt = $this->actingAs($this->admin())->postJson($url)->assertOk()->assertJsonPath('pending', true)->json();
            $row = DB::table('ai_requests')->where('request_uuid', $receipt['request_id'])->first();
            $this->assertNull($row->user_id);
            app(AiExecutionService::class)->execute($row->id);
            $this->getJson($url.'/'.$receipt['request_id'])->assertOk()->assertJsonPath('connected', true);
            $this->assertDatabaseHas('ai_requests', ['id' => $row->id, 'status' => 'completed', 'final_charge' => 0]);
        }
    }

    public function test_generation_connection_respects_budget_and_does_not_send_when_disabled(): void
    {
        $this->configureGenerationDiagnostic();
        config()->set('pm-ai.global_daily_budget_usd', 0);
        Http::fake();
        $this->actingAs($this->admin())->postJson('/admin/ai/feature-connection/pmp')->assertOk()->assertJsonPath('code', 'BUDGET_NOT_CONFIGURED');
        config()->set('pm-ai.enabled', false);
        $this->postJson('/admin/ai/feature-connection/daily-challenge')->assertOk()->assertJsonPath('code', 'FEATURE_DISABLED');
        $this->assertDatabaseCount('ai_requests', 0);
        Http::assertNothingSent();
    }

    public function test_feed_connection_uses_actual_omni_and_budgeted_responses_endpoints(): void
    {
        $this->configureGenerationDiagnostic();
        config()->set(['pm-ai.enabled' => true, 'pm-ai.post_check_enabled' => true, 'pm-ai.post_check_provider' => 'omni', 'pm-ai.post_check_api_key' => 'synthetic-moderation-secret', 'pm-ai.post_check_external_moderation' => false, 'pm-ai.post_check_daily_budget_usd' => 5]);
        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response(['results' => [['flagged' => false, 'categories' => ['hate' => false]]]]),
            'https://api.openai.com/v1/responses' => Http::response(['status' => 'completed', 'output' => [['content' => [['type' => 'output_text', 'text' => 'OK']]]], 'usage' => ['input_tokens' => 10, 'output_tokens' => 5]]),
        ]);
        Http::preventStrayRequests();
        $this->actingAs($this->admin())->postJson('/admin/ai/feature-connection/feed-moderation')->assertOk()->assertJsonPath('connected', true)->assertJsonPath('verification', 'moderation')->assertDontSee('synthetic-moderation-secret');
        config()->set('pm-ai.post_check_provider', 'responses');
        $this->postJson('/admin/ai/feature-connection/feed-moderation')->assertOk()->assertJsonPath('connected', true)->assertJsonPath('verification', 'responses');
        Http::assertSentCount(2);
        Http::assertSent(fn ($request) => $request->method() === 'POST' && str_ends_with($request->url(), '/moderations') && $request->hasHeader('Authorization', 'Bearer synthetic-moderation-secret'));
        $this->assertDatabaseHas('ai_requests', ['subject_type' => 'workspace_credential_test', 'feature_code' => 'feed_moderation', 'status' => 'completed']);
    }

    public function test_diagnostic_throttle_is_independent_for_each_feature_and_action(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', null);
        config()->set('pm-ai.api_key', null);
        config()->set('pm-ai.post_check_api_key', null);
        config()->set('pm-ai.post_check_provider', 'responses');
        Http::fake();
        $this->actingAs($this->admin());
        $daily = '/admin/ai/feature-connection/daily-challenge';
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson($daily)->assertOk();
        }
        $this->postJson($daily)->assertStatus(429)->assertHeader('Retry-After');
        $this->postJson('/admin/ai/feature-connection/pmp')->assertOk();
        $this->postJson('/admin/ai/feature-connection/feed-moderation')->assertOk();
        $this->postJson('/admin/ai/feed-moderation/test')->assertUnprocessable();
        $this->postJson('/admin/ai/career-trends/connection-test', ['provider' => 'openai'])->assertOk();
        $this->getJson('/admin/ai/career-trends/connection-test/11111111-1111-4111-8111-111111111111')->assertNotFound();
        Http::assertNothingSent();
        $this->travel(61)->seconds();
        $this->postJson($daily)->assertOk();
    }

}
