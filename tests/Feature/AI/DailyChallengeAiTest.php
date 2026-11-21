<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Services\AiEditorialService;
use App\Domain\AI\Services\AiExecutionService;
use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Support\AiFailure;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use Database\Seeders\DailyChallengeAiSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DailyChallengeAiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.editorial_enabled', true);
        config()->set('pm-ai.daily_challenge_api_key', 'test-key-unused');
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
    }

    private function enable(bool $publish = true): void
    {
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'enabled' => true, 'auto_publish' => $publish,
            'auto_review' => true, 'expiry_hours' => 24,
        ]);
    }

    private function generatedPayload(): array
    {
        return [
            'title' => 'Recovering a delayed milestone', 'summary' => 'A supplier delay threatens a sprint goal.',
            'situation' => 'A key component is delayed and the sponsor expects a fixed release.',
            'known_facts' => ['Supplier delay is confirmed', 'A workaround is available'],
            'topics' => ['Risk', 'Stakeholders'], 'difficulty' => 'Intermediate',
            'focus' => 'Risk response', 'learner_prompt' => 'What would you do first and who would you involve?',
            'rubric_criteria' => [
                ['key' => 'assessment', 'description' => 'Assess impact before changing scope', 'max_points' => 4],
                ['key' => 'communication', 'description' => 'Engage sponsor with options', 'max_points' => 3],
                ['key' => 'action', 'description' => 'Choose an actionable mitigation', 'max_points' => 3],
            ],
        ];
    }

    private function draft(string $date): int
    {
        return DB::table('ai_editorial_drafts')->insertGetId([
            'feature' => 'scenario_generate', 'slot_key' => 'daily-scenario:'.$date,
            'status' => 'pending_review', 'publication_at' => now()->subMinutes(5),
            'payload_encrypted' => Crypt::encryptString(json_encode($this->generatedPayload())),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_seeder_is_idempotent_and_does_not_enable_automatic_publication(): void
    {
        $this->seed(DailyChallengeAiSeeder::class);
        $this->seed(DailyChallengeAiSeeder::class);
        $this->assertSame(1, DB::table('ai_features')->where('code', 'daily_challenge_review')->count());
        $this->assertSame(1, DB::table('ai_prompt_versions')->where('feature_code', 'scenario_generate')->count());
        $this->assertSame('gpt-5-nano', DB::table('ai_features')->where('code', 'scenario_generate')->value('model'));
        $this->assertSame(0, (int) app(DailyChallengeSettings::class)->get()->auto_publish);
    }

    public function test_publication_needs_admin_opt_in_and_is_exactly_once_per_slot(): void
    {
        $id = $this->draft(now('Asia/Dhaka')->toDateString());
        $service = app(AiEditorialService::class);
        $this->assertNull($service->publishAutomatedScenario($id));
        $this->enable();
        $scenarioId = $service->publishAutomatedScenario($id);
        $this->assertNotNull($scenarioId);
        $this->assertNull($service->publishAutomatedScenario($id));
        $this->assertSame(1, DB::table('scenarios')->where('daily_slot', now('Asia/Dhaka')->toDateString())->count());
        $this->assertSame(10, (int) DB::table('scenario_rubric_versions')->where('scenario_id', $scenarioId)->value('max_score'));
        $this->assertNull(DB::table('scenario_rubric_versions')->where('scenario_id', $scenarioId)->value('approved_by'));
    }

    public function test_scheduled_draft_waits_until_due_and_publishes_without_staff_review(): void
    {
        $this->enable();
        $date = now('Asia/Dhaka')->toDateString();
        $id = $this->draft($date);
        DB::table('ai_editorial_drafts')->where('id', $id)->update([
            'status' => 'scheduled', 'publication_at' => now()->addHour(),
        ]);

        $this->artisan('daily-challenge:publish')->assertExitCode(0);
        $this->assertSame(0, DB::table('scenarios')->where('daily_slot', $date)->count());

        DB::table('ai_editorial_drafts')->where('id', $id)
            ->update(['publication_at' => now()->subMinute()]);
        $this->artisan('daily-challenge:publish')->assertExitCode(0);
        $this->assertDatabaseHas('ai_editorial_drafts', ['id' => $id, 'status' => 'published']);
        $this->assertSame(1, DB::table('scenarios')->where('daily_slot', $date)->count());
        $this->assertNull(DB::table('ai_editorial_drafts')->where('id', $id)->value('reviewed_by'));

        $this->artisan('daily-challenge:publish')->assertExitCode(0);
        $this->assertSame(1, DB::table('scenarios')->where('daily_slot', $date)->count());
    }

    public function test_expiry_closes_daily_challenge_not_ordinary_scenario(): void
    {
        $this->enable();
        $id = $this->draft(now('Asia/Dhaka')->toDateString());
        $scenarioId = app(AiEditorialService::class)->publishAutomatedScenario($id);
        DB::table('scenarios')->where('id', $scenarioId)->update([
            'expires_at' => now()->subMinute(), 'status' => 'published',
        ]);
        $manualId = DB::table('scenarios')->insertGetId([
            'slug' => 'manual-scenario', 'title' => 'Manual', 'summary' => 'Manual summary',
            'situation' => 'Manual situation', 'known_facts' => json_encode(['One']),
            'topics' => json_encode(['Risk']), 'focus' => 'Practice',
            'status' => 'published', 'ai_generated' => false,
            'expires_at' => now()->subMinute(), 'published_at' => now()->subDay(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->assertSame(1, app(DailyChallengeSettings::class)->closeExpired());
        $this->assertSame('closed', DB::table('scenarios')->where('id', $scenarioId)->value('status'));
        $this->assertSame('published', DB::table('scenarios')->where('id', $manualId)->value('status'));
    }

    public function test_generation_moderation_skip_is_local_opt_in_only_and_can_publish(): void
    {
        $this->seed(DailyChallengeAiSeeder::class);
        $this->enable();
        $fake = new class($this->generatedPayload()) implements AiProvider {
            public array $seenModeration = [];

            public function __construct(private readonly array $payload) {}

            public function generate(string $model, string $instructions, array $context,
                array $schema, int $maxOutputTokens, bool $useExternalModeration = true): array
            {
                $this->seenModeration[] = $useExternalModeration;

                return ['id' => 'resp_safe_generated', 'model' => $model, 'result' => $this->payload,
                    'input_tokens' => 120, 'cached_tokens' => 0, 'output_tokens' => 100];
            }
        };
        $this->app->instance(AiProvider::class, $fake);

        foreach ([
            ['environment' => 'local', 'skip' => true, 'moderate' => false],
            ['environment' => 'local', 'skip' => false, 'moderate' => true],
            ['environment' => 'production', 'skip' => true, 'moderate' => true],
        ] as $index => $case) {
            $this->app->instance('env', $case['environment']);
            config()->set('pm-ai.daily_challenge_skip_generation_moderation', $case['skip']);
            $date = now('Asia/Dhaka')->addDays($index)->toDateString();
            $draftId = DB::table('ai_editorial_drafts')->insertGetId([
                'feature' => 'scenario_generate', 'slot_key' => 'daily-scenario:'.$date,
                'status' => 'queued', 'publication_at' => now()->subMinutes(5),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $requestId = DB::table('ai_requests')->insertGetId([
                'request_uuid' => (string) Str::uuid(), 'feature_code' => 'scenario_generate',
                'subject_type' => 'editorial_draft', 'subject_id' => $draftId,
                'status' => 'queued', 'model' => 'gpt-5-nano',
                'max_output_tokens' => 1700,
                'payload_encrypted' => Crypt::encryptString(json_encode([
                    'context' => ['context' => [
                        'local_publication_date' => $date,
                        'topic' => 'Project management challenge',
                    ], 'message' => null],
                    'instructions' => 'Create one safe project-management scenario.',
                ], JSON_THROW_ON_ERROR)),
                'model_price_snapshot' => json_encode([
                    'input' => '0.05', 'cached' => '0.005', 'output' => '0.40',
                ], JSON_THROW_ON_ERROR),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('ai_editorial_drafts')->where('id', $draftId)
                ->update(['request_id' => $requestId]);

            app(AiExecutionService::class)->execute($requestId);
            $this->assertSame($case['moderate'], $fake->seenModeration[$index]);
            $this->assertSame('completed', DB::table('ai_requests')
                ->where('id', $requestId)->value('status'));
            $this->assertSame('scheduled', DB::table('ai_editorial_drafts')
                ->where('id', $draftId)->value('status'));

            if ($index === 0) {
                $scenarioId = app(AiEditorialService::class)->publishAutomatedScenario($draftId);
                $this->assertNotNull($scenarioId);
                $this->assertDatabaseHas('scenarios', [
                    'id' => $scenarioId, 'daily_slot' => $date, 'status' => 'published',
                ]);
            }
        }
    }

    public function test_scoring_is_server_summed_and_requires_ten_point_rubric(): void
    {
        $rubric = ['criteria' => $this->generatedPayload()['rubric_criteria'], 'max_score' => 10];
        $answer = [
            'criteria' => [
                ['key' => 'assessment', 'points' => 3, 'evidence' => 'Assessed impact'],
                ['key' => 'communication', 'points' => 2, 'evidence' => 'Escalated carefully'],
                ['key' => 'action', 'points' => 1, 'evidence' => 'Suggested partial workaround'],
            ],
            'strengths' => ['Clear stakeholder analysis'], 'gaps' => ['Risk ownership missing'],
            'next_actions' => ['Document mitigation'], 'disclaimer' => 'Educational AI feedback only',
        ];
        $validated = app(AiFeatureCatalog::class)->validate('daily_challenge_review', $answer, $rubric);
        $this->assertSame(6, $validated['total_score']);
        $answer['criteria'][0]['points'] = 5;
        $this->expectException(AiFailure::class);
        app(AiFeatureCatalog::class)->validate('daily_challenge_review', $answer, $rubric);
    }
}
