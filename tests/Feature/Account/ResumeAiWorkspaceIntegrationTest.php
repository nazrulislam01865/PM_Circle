<?php

namespace Tests\Feature\Account;

use App\Domain\AI\Services\AiFeatureRouting;
use App\Domain\AI\Services\AiSubjectContext;
use App\Domain\AI\Services\ResumeExtractionSettings;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Identity\Services\ResumeDocument;
use App\Models\User;
use App\Services\Resume\ResumeTextExtractor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class ResumeAiWorkspaceIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private function price(): void
    {
        config()->set(['pm-ai.allowed_models' => ['gpt-4.1-mini'], 'pm-ai.global_daily_budget_usd' => 10, 'pm-ai.resume_extract_api_key' => 'test-resume-key', 'pm-ai.resume_extract_enabled' => false]);
        DB::table('ai_model_prices')->insert(['model' => 'gpt-4.1-mini', 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 1, 'output_usd_per_m' => 1, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function test_workspace_can_configure_extraction_without_environment_model(): void
    {
        $this->price();
        $admin = User::factory()->create(['is_admin' => true, 'status' => 'active', 'email_verified_at' => now()]);
        DB::table('ai_admin_permissions')->insert(['user_id' => $admin->id, 'permission' => 'ai.manage_quotas', 'created_at' => now()]);
        $this->actingAs($admin)->putJson('/admin/ai/workspace/features/resume_extract', ['primary_model' => 'gpt-4.1-mini', 'strategy' => 'primary_only', 'enabled' => true, 'request_daily_limit' => 2, 'output_token_limit' => 3000])->assertOk();
        app(AiFeatureRouting::class)->forget();
        $settings = app(ResumeExtractionSettings::class);
        $this->assertTrue($settings->enabled());
        $this->assertSame('gpt-4.1-mini', $settings->model());
        $this->assertSame(2, $settings->dailyLimit());
        $this->assertSame(3000, $settings->outputLimit());
    }

    public function test_consented_editor_extraction_uses_workspace_model_and_never_saves_cv(): void
    {
        $this->price();
        config()->set('pm-circle.temporary_paid_access_enabled', true);
        $user = User::factory()->create(['onboarding_step' => 3]);
        DB::table('temporary_memberships')->insert(['user_id' => $user->id, 'plan_code' => 'pro', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('ai_workspace_feature_routes')->insert(['feature_code' => 'resume_extract', 'primary_model' => 'gpt-4.1-mini', 'enabled_override' => true, 'request_daily_limit' => 1, 'output_token_limit' => 3000, 'strategy' => 'primary_only', 'created_at' => now(), 'updated_at' => now()]);
        $this->mock(ResumeTextExtractor::class, fn ($mock) => $mock->shouldReceive('extractTemplate')->once()->andReturn(str_repeat('Example candidate coordinates delivery. ', 4)));
        $document = array_fill_keys(ResumeDocument::CONTACT, '');
        foreach (ResumeDocument::SECTIONS as $section => $keys) $document[$section] = [];
        $document['projects'] = [['title' => 'Example project']];
        Http::fake(['*api.openai.com/v1/responses' => Http::response(['status' => 'completed', 'usage' => ['input_tokens' => 100, 'output_tokens' => 80], 'output' => [['content' => [['type' => 'output_text', 'text' => json_encode(['fields' => ['name' => 'Example candidate', 'role' => '', 'company' => '', 'location' => '', 'summary' => 'Coordinates delivery.'], 'document' => $document])]]]]])]);
        $this->actingAs($user)->postJson('/dashboard/resume-assistant/extract', ['resume' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'), 'use_ai' => true])->assertUnprocessable();
        Http::assertNothingSent();
        $this->postJson('/dashboard/resume-assistant/extract', ['resume' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'), 'use_ai' => true, 'ai_consent' => true])->assertOk()->assertJsonPath('document.projects.0.title', 'Example project');
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer test-resume-key') && $request['model'] === 'gpt-4.1-mini' && $request['store'] === false);
        $this->assertDatabaseHas('ai_requests', ['feature_code' => 'resume_extract', 'status' => 'completed', 'input_tokens' => 100, 'output_tokens' => 80]);
        $this->assertDatabaseMissing('profile_resumes', ['user_id' => $user->id]);
    }

    public function test_editor_draft_context_requires_consent_and_does_not_need_uploaded_resume(): void
    {
        $user = User::factory()->create();
        $context = app(AiSubjectContext::class);
        try {
            $context->resolve($user, 'resume_rewrite', ['draft' => true, 'section' => 'Professional summary'], 'Managed delivery schedules.', false);
            $this->fail('Consent is required.');
        } catch (AiFailure $e) {
            $this->assertSame('CONSENT_REQUIRED', $e->safeCode);
        }
        $result = $context->resolve($user, 'resume_rewrite', ['draft' => true, 'section' => 'Professional summary'], 'Managed delivery schedules.', true);
        $this->assertSame('resume_editor_draft', $result['subject_type']);
        $this->assertNull($result['subject_id']);
        $this->assertSame('Managed delivery schedules.', $result['context']['resume_excerpt']);
    }
}
