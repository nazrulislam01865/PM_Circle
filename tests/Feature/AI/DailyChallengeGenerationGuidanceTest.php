<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Services\AiExecutionService;
use App\Domain\DailyChallenge\Services\DailyChallengeGenerationBrief;
use App\Models\User;
use Database\Seeders\DailyChallengeAiSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class DailyChallengeGenerationGuidanceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.editorial_enabled', true);
        config()->set('pm-ai.daily_challenge_api_key', 'synthetic-daily-key');
        config()->set('pm-ai.global_daily_budget_usd', 5);
        config()->set('pm-ai.editorial_budget_usd', 1);
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
        $this->seed(DailyChallengeAiSeeder::class);
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'enabled' => true, 'auto_publish' => true, 'auto_review' => true,
        ]);
        $this->admin = User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'email_verified_at' => now(),
        ]);
        DB::table('ai_admin_permissions')->insert([
            'user_id' => $this->admin->id, 'permission' => 'ai.manage_editorial',
            'created_at' => now(),
        ]);
    }

    private function settingsInput(): array
    {
        return [
            'enabled' => true, 'auto_publish' => true, 'auto_review' => true,
            'publish_time' => '08:00', 'expiry_hours' => 24,
            'max_reviews_per_user_daily' => 10,
            'generation_title_hint' => 'Improving delivery across teams',
            'generation_domains' => ['People', 'Process'],
            'generation_topics' => ['Risk Management', 'Stakeholder Management'],
            'generation_difficulty' => 'Moderate', 'generation_approach' => 'Hybrid',
            'generation_notes' => 'Keep the constraints realistic and the tradeoff measurable.',
            'reason' => 'Editorial topics and domains updated by administrator',
        ];
    }

    public function test_admin_can_save_multi_domains_topics_and_guidance(): void
    {
        $this->actingAs($this->admin)->put('/admin/ai/daily-challenge', $this->settingsInput())
            ->assertSessionHasNoErrors();

        $row = DB::table('daily_challenge_settings')->where('id', 1)->first();
        $this->assertSame(['People', 'Process'], json_decode($row->generation_domains, true));
        $this->assertSame(['Risk Management', 'Stakeholder Management'], json_decode($row->generation_topics, true));
        $this->assertSame('Hybrid', $row->generation_approach);
        $this->assertSame('Improving delivery across teams', $row->generation_title_hint);
    }

    public function test_unknown_or_inactive_master_data_values_are_rejected(): void
    {
        $invalid = $this->settingsInput();
        $invalid['generation_domains'] = ['Nonexistent domain'];
        $this->actingAs($this->admin)->put('/admin/ai/daily-challenge', $invalid)
            ->assertSessionHasErrors('generation_domains.0');
        $this->assertNull(DB::table('daily_challenge_settings')->where('id', 1)->value('generation_title_hint'));

        DB::table('master_data_options')->where('category', 'daily_challenge_topic')
            ->where('value', 'Risk Management')->update(['is_active' => false]);
        $invalid = $this->settingsInput();
        $this->actingAs($this->admin)->put('/admin/ai/daily-challenge', $invalid)
            ->assertSessionHasErrors('generation_topics.0');
    }

    public function test_non_admin_cannot_change_generation_guidance(): void
    {
        $member = User::factory()->create(['is_admin' => false]);
        $this->actingAs($member)->put('/admin/ai/daily-challenge', $this->settingsInput())
            ->assertForbidden();
    }

    public function test_rotation_is_stable_for_each_date_and_empty_selections_remain_supported(): void
    {
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'generation_domains' => json_encode(['People', 'Process']),
            'generation_topics' => json_encode(['Risk Management', 'Stakeholder Management']),
            'generation_difficulty' => 'Moderate', 'generation_approach' => 'Hybrid',
        ]);
        $service = app(DailyChallengeGenerationBrief::class);
        $day = '2026-11-21';
        $first = $service->forDate($day);
        $this->assertSame($first, $service->forDate($day));
        $this->assertContains($first['primary_domain'], ['People', 'Process']);
        $this->assertContains($first['primary_topic'], ['Risk Management', 'Stakeholder Management']);
        $this->assertNotSame($first['primary_domain'], $service->forDate('2026-11-22')['primary_domain']);
        $this->assertSame('Moderate', $first['difficulty']);
        $this->assertSame('Hybrid', $first['approach']);

        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'generation_domains' => null, 'generation_topics' => null,
        ]);
        $this->assertNull($service->forDate($day)['primary_domain']);
        $this->assertNull($service->forDate($day)['primary_topic']);

        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'generation_domains' => json_encode(['People']),
            'generation_topics' => json_encode(['Risk Management']),
        ]);
        DB::table('master_data_options')->where('category', 'daily_challenge_domain')
            ->where('value', 'People')->update(['is_active' => false]);
        $this->assertNull($service->forDate($day)['primary_domain']);
        $this->assertSame('Risk Management', $service->forDate($day)['primary_topic']);
    }

    public function test_queued_manual_title_and_generation_focus_are_pinned_for_the_date(): void
    {
        $this->actingAs($this->admin)->put('/admin/ai/daily-challenge', $this->settingsInput())
            ->assertSessionHasNoErrors();

        $this->actingAs($this->admin)->post('/admin/ai/daily-challenge/generate', [
            'date' => '2026-12-05', 'exact_title' => 'Recovering a delayed procurement milestone',
        ])->assertSessionHasNoErrors();

        $row = DB::table('ai_requests')->where('feature_code', 'scenario_generate')->first();
        $this->assertNotNull($row);
        $payload = json_decode(Crypt::decryptString($row->payload_encrypted), true);
        $brief = $payload['context']['context']['editorial_brief'];
        $this->assertSame('Recovering a delayed procurement milestone', $brief['admin_exact_title']);
        $this->assertContains($brief['primary_domain'], ['People', 'Process']);
        $this->assertContains($brief['primary_topic'], ['Risk Management', 'Stakeholder Management']);
        $this->assertStringContainsString('editorial_brief', $payload['instructions']);

        // The slot is immutable once queued; a second title must not replace it.
        $this->actingAs($this->admin)->post('/admin/ai/daily-challenge/generate', [
            'date' => '2026-12-05', 'exact_title' => 'Different title',
        ])->assertSessionHasNoErrors();
        $this->assertSame(1, DB::table('ai_requests')->where('feature_code', 'scenario_generate')->count());
        $this->assertSame('Recovering a delayed procurement milestone', json_decode(
            Crypt::decryptString(DB::table('ai_requests')->where('id', $row->id)->value('payload_encrypted')),
            true,
        )['context']['context']['editorial_brief']['admin_exact_title']);
    }

    public function test_completed_ai_result_uses_the_exact_admin_title(): void
    {
        $this->actingAs($this->admin)->post('/admin/ai/daily-challenge/generate', [
            'date' => '2026-12-06', 'exact_title' => 'When the supplier changes the plan',
        ])->assertSessionHasNoErrors();

        $fake = new class implements AiProvider {
            public function generate(string $model, string $instructions, array $context, array $schema,
                int $maxOutputTokens, bool $useExternalModeration = true): array
            {
                return [
                    'id' => 'resp_generated_brief_test', 'model' => $model,
                    'result' => [
                        'title' => 'Model-proposed title', 'summary' => 'A supplier setback affects delivery.',
                        'situation' => 'A shipment was delayed and a sponsor demands an update.',
                        'known_facts' => ['Shipment delayed', 'Stakeholders aware'],
                        'topics' => ['Project Management'], 'difficulty' => 'Moderate',
                        'focus' => 'Risk Management', 'learner_prompt' => 'What should happen first?',
                        'rubric_criteria' => [
                            ['key' => 'risk', 'description' => 'Identify the exposure', 'max_points' => 5],
                            ['key' => 'communication', 'description' => 'Involve key stakeholders', 'max_points' => 5],
                        ],
                    ],
                    'input_tokens' => 100, 'cached_tokens' => 0, 'output_tokens' => 90,
                ];
            }
        };
        $this->app->instance(AiProvider::class, $fake);
        $id = (int) DB::table('ai_requests')->where('feature_code', 'scenario_generate')->value('id');
        app(AiExecutionService::class)->execute($id);
        $this->assertSame('completed', DB::table('ai_requests')->where('id', $id)->value('status'));
        $draftId = (int) DB::table('ai_editorial_drafts')->where('request_id', $id)->value('id');
        $draft = DB::table('ai_editorial_drafts')->where('id', $draftId)->first();
        $result = json_decode(Crypt::decryptString($draft->payload_encrypted), true);
        $this->assertSame('When the supplier changes the plan', $result['title']);
    }
}
