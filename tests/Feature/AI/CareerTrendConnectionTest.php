<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiExecutionService;
use App\Domain\Careers\Services\CareerTrendSettings;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class CareerTrendConnectionTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/admin/ai/career-trends';
    private const MODEL = 'gemini-test-model';

    private function editor(): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        DB::table('ai_admin_permissions')->insert(['user_id' => $admin->id, 'permission' => 'ai.manage_editorial', 'created_at' => now()]);
        return $admin;
    }

    private function configure(): void
    {
        Queue::fake();
        config()->set([
            'pm-ai.enabled' => true, 'pm-ai.editorial_enabled' => true,
            'pm-ai.allowed_models' => ['gpt-4.1-mini', self::MODEL], 'pm-ai.api_key' => 'fake-openai-key',
            'pm-ai.gemini_api_key' => 'fake-gemini-key', 'pm-ai.gemini_trend_model' => self::MODEL,
            'pm-ai.global_daily_budget_usd' => 10, 'pm-ai.editorial_budget_usd' => 5,
        ]);
        DB::table('ai_features')->insert(['code' => 'trend_draft', 'enabled' => true, 'min_plan' => 'staff', 'model' => 'gpt-4.1-mini', 'created_at' => now(), 'updated_at' => now()]);
        foreach (['gpt-4.1-mini', self::MODEL] as $model) {
            DB::table('ai_model_prices')->insert(['model' => $model, 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 0.1, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        }
        Http::preventStrayRequests();
    }

    public function test_custom_topics_and_provider_persist_and_invalid_inputs_fail(): void
    {
        $editor = $this->editor();
        $data = array_replace(CareerTrendSettings::defaults(), ['topics' => ['job_demand', 'AI governance'], 'target_levels' => ['coordinator', 'Programme lead'], 'ai_provider' => 'gemini']);
        $this->actingAs($editor)->from(self::URL)->put(self::URL, $data)->assertRedirect(self::URL);
        $this->assertSame($data, app(CareerTrendSettings::class)->get());
        $this->assertDatabaseHas('master_data_options', ['category' => 'career_trend_topic', 'value' => 'job_demand']);
        $this->putJson(self::URL, array_replace($data, ['topics' => ['AI', 'ai'], 'ai_provider' => 'untrusted']))->assertUnprocessable()->assertJsonValidationErrors(['topics.0', 'ai_provider']);
    }

    public function test_gemini_diagnostic_uses_real_adapter_with_metering_and_no_draft(): void
    {
        $this->configure();
        $editor = $this->editor();
        $this->actingAs($editor);
        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response(['results' => [['flagged' => false]]]),
            'https://generativelanguage.googleapis.com/v1beta/models/*' => Http::response([
                'responseId' => 'test-response', 'modelVersion' => self::MODEL,
                'candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => [['text' => '{"title":"Test","summary":"Test","body_markdown":"Test","source_urls":[]}']]]]],
                'usageMetadata' => ['promptTokenCount' => 45, 'candidatesTokenCount' => 12, 'thoughtsTokenCount' => 5],
            ]),
        ]);
        $receipt = $this->postJson(self::URL.'/connection-test', ['provider' => 'gemini'])->assertOk()->assertJsonPath('pending', true)->json();
        $row = DB::table('ai_requests')->where('request_uuid', $receipt['request_id'])->first();
        $this->assertSame('gemini', $row->provider);
        $this->assertSame(self::MODEL, $row->model);
        $this->postJson(self::URL.'/connection-test', ['provider' => 'gemini'])->assertJsonPath('request_id', $receipt['request_id']);
        app(AiExecutionService::class)->execute($row->id);
        $this->getJson(self::URL.'/connection-test/'.$receipt['request_id'])->assertOk()->assertJsonPath('connected', true)->assertJsonPath('pending', false);
        $this->assertDatabaseHas('ai_requests', ['id' => $row->id, 'status' => 'completed', 'output_tokens' => 17]);
        $this->assertDatabaseCount('ai_editorial_drafts', 0);
        $this->assertDatabaseHas('ai_request_budget_allocations', ['request_id' => $row->id, 'finalized' => true]);
        Http::assertSentCount(3);
        $this->actingAs($this->editor())->getJson(self::URL.'/connection-test/'.$receipt['request_id'])->assertNotFound();
    }

    public function test_openai_authentication_failure_reports_safe_error(): void
    {
        $this->configure();
        Http::fake([
            'https://api.openai.com/v1/moderations' => Http::response(['results' => [['flagged' => false]]]),
            'https://api.openai.com/v1/responses' => Http::response(['error' => ['code' => 'invalid_api_key', 'message' => 'secret upstream details']], 401),
        ]);
        $this->actingAs($this->editor());
        $receipt = $this->postJson(self::URL.'/connection-test', ['provider' => 'openai'])->assertOk()->json();
        $row = DB::table('ai_requests')->where('request_uuid', $receipt['request_id'])->first();
        app(AiExecutionService::class)->execute($row->id);
        $this->getJson(self::URL.'/connection-test/'.$receipt['request_id'])->assertOk()->assertJsonPath('connected', false)->assertJsonPath('code', 'PROVIDER_AUTH_FAILED')->assertDontSee('secret upstream details');
        $this->assertDatabaseCount('ai_editorial_drafts', 0);
    }
}
