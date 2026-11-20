<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiGateway;
use App\Domain\DailyChallenge\Jobs\QueueDailyChallengeReview;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Models\User;
use Database\Seeders\DailyChallengeAiSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

final class DailyChallengeRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.editorial_enabled', true);
        config()->set('pm-ai.daily_challenge_api_key', 'synthetic-test-key');
        config()->set('pm-ai.post_check_api_key', 'synthetic-omni-test-key');
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
        config()->set('pm-ai.global_daily_budget_usd', 5);
        config()->set('pm-ai.editorial_budget_usd', 1);
        $this->seed(DailyChallengeAiSeeder::class);
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'enabled' => true, 'auto_review' => true, 'auto_publish' => true,
            'publish_time' => '08:00', 'updated_at' => now(),
        ]);
        $this->admin = User::factory()->create([
            'is_admin' => true, 'status' => 'active', 'email_verified_at' => now(),
        ]);
        DB::table('ai_admin_permissions')->insert([
            'user_id' => $this->admin->id, 'permission' => 'ai.manage_editorial',
            'created_at' => now(),
        ]);
    }

    private function failingRequest(string $feature, string $subjectType, int $subjectId,
        ?int $userId = null, string $error = 'MODERATION_UNAVAILABLE'): int
    {
        return DB::table('ai_requests')->insertGetId([
            'request_uuid' => (string) Str::uuid(), 'user_id' => $userId,
            'client_key' => $userId ? (string) Str::uuid() : null,
            'feature_code' => $feature, 'subject_type' => $subjectType,
            'subject_id' => $subjectId, 'status' => 'failed', 'error_code' => $error,
            'model' => 'gpt-5-nano', 'payload_encrypted' => Crypt::encryptString('{}'),
            'created_at' => now()->subHour(), 'updated_at' => now()->subHour(),
        ]);
    }

    private function failedDraft(): array
    {
        $date = now('Asia/Dhaka')->addDays(2)->toDateString();
        $draftId = DB::table('ai_editorial_drafts')->insertGetId([
            'feature' => 'scenario_generate', 'slot_key' => 'daily-scenario:'.$date,
            'status' => 'failed', 'generation_attempts' => 3,
            'publication_at' => now()->addDays(2),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $requestId = $this->failingRequest('scenario_generate', 'editorial_draft', $draftId);
        DB::table('ai_editorial_drafts')->where('id', $draftId)->update(['request_id' => $requestId]);
        return [$date, $draftId, $requestId];
    }

    private function allowedModeration(): void
    {
        Http::fake(['*/moderations' => Http::response([
            'results' => [['flagged' => false]],
        ], 200, ['x-request-id' => 'req_synthetic12345'])]);
    }

    public function test_production_probe_denial_blocks_recovery_without_changing_anything(): void
    {
        [$date, $draftId] = $this->failedDraft();
        Http::fake(['*/moderations' => Http::response(['error' => ['message' => 'Forbidden']],
            403, ['x-request-id' => 'req_synthetic12345'])]);

        $this->artisan('daily-challenge:recover-draft', [
            'date' => $date, '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'Investigate failed moderation access',
        ])->assertExitCode(1);

        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed', 'generation_attempts' => 3,
        ]);
        $this->assertSame(1, DB::table('ai_requests')->where('subject_type', 'editorial_draft')
            ->where('subject_id', $draftId)->count());
        $this->assertSame(0, DB::table('ai_audit_events')
            ->where('action', 'daily_challenge.draft.recover')->count());
    }

    public function test_todays_failed_draft_is_recoverable_before_publication_time(): void
    {
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-11-20 00:30:00', 'Asia/Dhaka'));
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'publish_time' => '23:30', 'updated_at' => now(),
        ]);
        [$futureDate, $draftId] = $this->failedDraft();
        DB::table('ai_editorial_drafts')->where('id', $draftId)->update([
            'slot_key' => 'daily-scenario:2026-11-20',
            'publication_at' => \Illuminate\Support\Carbon::parse('2026-11-20 23:30:00', 'Asia/Dhaka')->utc(),
        ]);

        $this->artisan('daily-challenge:recover-draft', ['date' => '2026-11-20'])
            ->assertExitCode(0);
        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed', 'generation_attempts' => 3,
        ]);
    }

    public function test_todays_failed_draft_cannot_be_recovered_after_publication_time(): void
    {
        $this->travelTo(\Illuminate\Support\Carbon::parse('2026-11-20 23:35:00', 'Asia/Dhaka'));
        DB::table('daily_challenge_settings')->where('id', 1)->update([
            'publish_time' => '23:30', 'updated_at' => now(),
        ]);
        [$futureDate, $draftId] = $this->failedDraft();
        DB::table('ai_editorial_drafts')->where('id', $draftId)->update([
            'slot_key' => 'daily-scenario:2026-11-20',
            'publication_at' => \Illuminate\Support\Carbon::parse('2026-11-20 23:30:00', 'Asia/Dhaka')->utc(),
        ]);
        $this->artisan('daily-challenge:recover-draft', ['date' => '2026-11-20'])
            ->assertExitCode(1);
        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed', 'generation_attempts' => 3,
        ]);
    }

    public function test_exhausted_future_draft_can_be_recovered_only_once_and_preserves_history(): void
    {
        [$date, $draftId, $historical] = $this->failedDraft();
        $this->allowedModeration();

        $this->artisan('daily-challenge:recover-draft', ['date' => $date])->assertExitCode(0);
        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed', 'generation_attempts' => 3,
        ]);

        $args = ['date' => $date, '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'Restore Daily Challenge future slot after provider recovery'];
        $this->artisan('daily-challenge:recover-draft', $args)->assertExitCode(0);

        $draft = DB::table('ai_editorial_drafts')->find($draftId);
        $this->assertSame('queued', $draft->status);
        $this->assertSame(1, (int) $draft->generation_attempts);
        $this->assertNotEquals($historical, $draft->request_id);
        $this->assertSame('failed', DB::table('ai_requests')->where('id', $historical)->value('status'));
        $this->assertDatabaseHas('ai_audit_events', [
            'action' => 'daily_challenge.draft.recover', 'subject_id' => $draftId,
            'actor_id' => $this->admin->id,
        ]);
        $this->assertSame(2, DB::table('ai_requests')->where('subject_type', 'editorial_draft')
            ->where('subject_id', $draftId)->count());
        $this->artisan('daily-challenge:recover-draft', $args)->assertExitCode(1);
    }

    public function test_budget_failure_rolls_back_recovery_and_preserves_exhausted_draft(): void
    {
        [$date, $draftId, $historical] = $this->failedDraft();
        $this->allowedModeration();
        // A positive but insufficient approved budget passes the preflight and
        // fails inside editorial admission, exercising the atomic rollback.
        config()->set('pm-ai.editorial_budget_usd', 0.000001);

        $this->artisan('daily-challenge:recover-draft', [
            'date' => $date, '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'Verify recovery is atomic when budget is exhausted',
        ])->assertExitCode(1);

        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed',
            'request_id' => $historical, 'generation_attempts' => 3,
        ]);
        $this->assertSame(1, DB::table('ai_requests')->where('subject_type', 'editorial_draft')
            ->where('subject_id', $draftId)->count());
        $this->assertSame(0, DB::table('ai_audit_events')
            ->where('action', 'daily_challenge.draft.recover')->count());
    }

    public function test_manual_draft_recovery_cannot_be_repeated_after_another_failure(): void
    {
        [$date, $draftId] = $this->failedDraft();
        $this->allowedModeration();
        $args = [
            'date' => $date, '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'One controlled recovery after provider access restoration',
        ];
        $this->artisan('daily-challenge:recover-draft', $args)->assertExitCode(0);

        $newRequestId = (int) DB::table('ai_editorial_drafts')
            ->where('id', $draftId)->value('request_id');
        DB::table('ai_requests')->where('id', $newRequestId)->update([
            'status' => 'failed', 'error_code' => 'MODERATION_UNAVAILABLE',
        ]);
        DB::table('ai_editorial_drafts')->where('id', $draftId)->update([
            'status' => 'failed', 'generation_attempts' => 3,
        ]);

        $this->artisan('daily-challenge:recover-draft', $args)->assertExitCode(1);
        $this->assertSame(1, DB::table('ai_audit_events')
            ->where('action', 'daily_challenge.draft.recover')
            ->where('subject_id', $draftId)->count());
        $this->assertSame(2, DB::table('ai_requests')->where('feature_code', 'scenario_generate')
            ->where('subject_id', $draftId)->count());
    }

    public function test_ambiguous_provider_request_is_never_replayed(): void
    {
        [$date, $draftId, $request] = $this->failedDraft();
        DB::table('ai_requests')->where('id', $request)->update(['status' => 'provider_status_unknown']);
        $this->allowedModeration();
        $this->artisan('daily-challenge:recover-draft', [
            'date' => $date, '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'Do not retry an ambiguous provider operation',
        ])->assertExitCode(1);
        $this->assertDatabaseHas('ai_editorial_drafts', [
            'id' => $draftId, 'status' => 'failed', 'generation_attempts' => 3,
        ]);
        Http::assertNothingSent();
    }

    private function failedMemberReview(): array
    {
        $member = User::factory()->create();
        $scenarioId = DB::table('scenarios')->insertGetId([
            'slug' => 'recover-failed-review', 'title' => 'Recovery review',
            'summary' => 'Recovery exercise', 'situation' => 'A project needs risk management.',
            'known_facts' => json_encode(['Deadline fixed', 'Team has alternatives']),
            'topics' => json_encode(['Risk']), 'focus' => 'Planning',
            'ai_generated' => true, 'daily_slot' => now('Asia/Dhaka')->subDay()->toDateString(),
            'status' => 'closed', 'published_at' => now()->subDay(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('scenario_rubric_versions')->insert([
            'scenario_id' => $scenarioId, 'version' => 1,
            'criteria_json' => json_encode([
                ['key' => 'risk', 'description' => 'Assess project risk', 'max_points' => 5],
                ['key' => 'action', 'description' => 'Choose next action', 'max_points' => 5],
            ]), 'max_score' => 10, 'approved_by' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $responseId = DB::table('scenario_responses')->insertGetId([
            'scenario_id' => $scenarioId, 'user_id' => $member->id,
            'body' => 'Assess the risk and agree a mitigation with stakeholders.',
            'ai_review_status' => 'failed', 'ai_score' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $requestId = $this->failingRequest('daily_challenge_review', 'scenario_response',
            $responseId, $member->id);
        return [$responseId, $requestId];
    }

    public function test_failed_member_review_uses_a_new_deduplicated_request_after_audited_recovery(): void
    {
        [$responseId, $original] = $this->failedMemberReview();
        $this->allowedModeration();

        $this->artisan('daily-challenge:recover-review', [
            'response' => $responseId,
            '--execute' => true, '--actor' => $this->admin->id,
            '--reason' => 'Recover failed educational member feedback',
        ])->assertExitCode(0);
        $this->assertSame('queued', DB::table('scenario_responses')
            ->where('id', $responseId)->value('ai_review_status'));
        Queue::assertPushed(QueueDailyChallengeReview::class);

        // Execute admission while retaining the AI execution job in a fake queue.
        $job = new QueueDailyChallengeReview($responseId);
        $job->handle(app(AiGateway::class), app(DailyChallengeSettings::class));

        $requests = DB::table('ai_requests')->where('feature_code', 'daily_challenge_review')
            ->where('subject_id', $responseId)->orderBy('id')->get(['id', 'status', 'client_key']);
        $this->assertCount(2, $requests);
        $this->assertSame($original, (int) $requests[0]->id);
        $this->assertSame('failed', $requests[0]->status);
        $this->assertSame('queued', $requests[1]->status);
        $this->assertNotSame($requests[0]->client_key, $requests[1]->client_key);
        $job->handle(app(AiGateway::class), app(DailyChallengeSettings::class));
        $this->assertSame(2, DB::table('ai_requests')
            ->where('feature_code', 'daily_challenge_review')->where('subject_id', $responseId)->count());
    }
}
