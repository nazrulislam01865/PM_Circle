<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Services\AiCreditService;
use App\Domain\AI\Services\AiExecutionService;
use App\Domain\AI\Services\AiGateway;
use App\Domain\AI\Support\AiFailure;
use App\Domain\Interview\InterviewAiReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

final class InterviewAiReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $member;
    private int $answerId;
    private string $answer = 'I assess risks with the team and communicate the mitigation plan.';

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
        config()->set(['pm-ai.enabled' => true, 'pm-ai.allowed_models' => ['gpt-5-nano'], 'pm-ai.api_key' => 'test-only', 'pm-ai.global_daily_budget_usd' => 10, 'pm-interview.enabled' => true]);
        $this->member = User::factory()->create(['status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now(), 'is_admin' => false]);
        $plan = DB::table('plans')->insertGetId(['code' => 'plus', 'name' => 'Plus', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $price = DB::table('plan_prices')->insertGetId(['plan_id' => $plan, 'months' => 1, 'amount_minor' => 1000, 'currency' => 'BDT', 'version' => 1, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('subscriptions')->insert(['user_id' => $this->member->id, 'plan_price_id' => $price, 'status' => 'active', 'starts_at' => now()->subDay(), 'ends_at' => now()->addMonth(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('ai_features')->where('code', InterviewAiReview::FEATURE)->update(['enabled' => true]);
        DB::table('ai_model_prices')->insert(['model' => 'gpt-5-nano', 'effective_from' => now()->subDay(), 'input_usd_per_m' => 1, 'cached_input_usd_per_m' => 0.5, 'output_usd_per_m' => 2, 'created_at' => now(), 'updated_at' => now()]);
        app(AiCreditService::class)->grant($this->member->id, 'test', 'interview-review-grant', 5, now()->addWeek());
        $session = DB::table('interview_sessions')->insertGetId(['user_id' => $this->member->id, 'industry' => 'software', 'role' => 'Project Manager', 'experience' => 'mid', 'question_types' => json_encode(['Situational']), 'answer_mode' => 'both', 'questions' => json_encode([['text' => 'How do you manage delivery risk?']]), 'question_count' => 1, 'status' => 'in_progress', 'created_at' => now(), 'updated_at' => now()]);
        $this->answerId = DB::table('interview_answers')->insertGetId(['interview_session_id' => $session, 'position' => 0, 'answer' => $this->answer, 'mode' => 'type', 'status' => 'evaluated', 'score' => 4, 'created_at' => now(), 'updated_at' => now()]);
    }

    private function input(): array
    {
        return ['feature' => InterviewAiReview::FEATURE, 'client_request_key' => (string) Str::uuid(), 'subject' => ['answer_id' => $this->answerId, 'answer_revision' => InterviewAiReview::revision($this->answer, 'type')], 'consent' => true, 'accepted_max_credits' => 1];
    }

    public function test_one_saved_revision_reserves_once_and_preserves_local_score(): void
    {
        $first = app(AiGateway::class)->submit($this->member, $this->input());
        $duplicate = app(AiGateway::class)->submit($this->member, $this->input());
        $this->assertSame($first['request_id'], $duplicate['request_id']);
        $this->assertDatabaseCount('ai_requests', 1);
        $this->app->instance(AiProvider::class, new class implements AiProvider {
            public function generate(string $model, string $instructions, array $context, array $schema, int $maxOutputTokens, bool $useExternalModeration = true): array
            {
                if (! $useExternalModeration || $context['context']['question'] !== 'How do you manage delivery risk?') throw new \RuntimeException('Wrong context');
                return ['id' => 'test-review', 'model' => $model, 'result' => ['summary' => 'Clear approach.', 'strengths' => ['Identifies risk.'], 'improvements' => ['Add a measurable outcome.'], 'suggested_answer' => 'Identify owners and monitor risks.'], 'input_tokens' => 100, 'cached_tokens' => 0, 'output_tokens' => 50];
            }
        });
        $id = DB::table('ai_requests')->where('request_uuid', $first['request_id'])->value('id');
        app(AiExecutionService::class)->execute($id);
        $this->assertDatabaseHas('ai_requests', ['id' => $id, 'status' => 'completed', 'final_charge' => 1]);
        $this->assertDatabaseHas('interview_answers', ['id' => $this->answerId, 'score' => 4, 'ai_review_request_id' => $id]);
        $this->assertDatabaseHas('ai_credit_wallets', ['user_id' => $this->member->id, 'available' => 4, 'reserved' => 0]);
        $this->actingAs($this->member)->getJson('/ai/requests/'.$first['request_id'])->assertOk()->assertJsonPath('result.summary', 'Clear approach.');
        $this->actingAs(User::factory()->create(['status' => 'active', 'onboarding_step' => 3, 'email_verified_at' => now(), 'is_admin' => false]))->getJson('/ai/requests/'.$first['request_id'])->assertNotFound();
    }

    public function test_missing_consent_stale_revision_and_foreign_answer_are_rejected(): void
    {
        $service = app(InterviewAiReview::class);
        foreach ([[$this->member, $this->input()['subject'], false, 'CONSENT_REQUIRED'], [$this->member, array_replace($this->input()['subject'], ['answer_revision' => str_repeat('0', 64)]), true, 'ANSWER_CHANGED'], [User::factory()->create(), $this->input()['subject'], true, 'SUBJECT_NOT_ACCESSIBLE']] as [$user, $subject, $consent, $expected]) {
            try { $service->context($user, $subject, $consent); $this->fail('Expected rejection'); }
            catch (AiFailure $e) { $this->assertSame($expected, $e->safeCode); }
        }
        $this->assertDatabaseCount('ai_requests', 0);
    }

    public function test_edited_answer_or_disabled_feature_before_execution_releases_credits(): void
    {
        $first = app(AiGateway::class)->submit($this->member, $this->input());
        DB::table('interview_answers')->where('id', $this->answerId)->update(['answer' => 'Edited response', 'ai_review_request_id' => null]);
        $id = DB::table('ai_requests')->where('request_uuid', $first['request_id'])->value('id');
        app(AiExecutionService::class)->execute($id);
        $this->assertDatabaseHas('ai_requests', ['id' => $id, 'status' => 'failed', 'error_code' => 'ANSWER_CHANGED', 'final_charge' => 0]);
        $this->assertDatabaseHas('ai_credit_wallets', ['user_id' => $this->member->id, 'available' => 5, 'reserved' => 0]);
        $this->answer = 'Edited response';
        $second = app(AiGateway::class)->submit($this->member, $this->input());
        DB::table('ai_features')->where('code', InterviewAiReview::FEATURE)->update(['enabled' => false]);
        app(AiExecutionService::class)->execute(DB::table('ai_requests')->where('request_uuid', $second['request_id'])->value('id'));
        $this->assertDatabaseHas('ai_requests', ['request_uuid' => $second['request_id'], 'status' => 'failed', 'error_code' => 'FEATURE_DISABLED', 'final_charge' => 0]);
        $this->assertDatabaseHas('ai_credit_wallets', ['user_id' => $this->member->id, 'available' => 5, 'reserved' => 0]);
    }
}
