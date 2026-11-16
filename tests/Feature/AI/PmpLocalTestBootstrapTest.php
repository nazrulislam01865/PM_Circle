<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiGateway;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

final class PmpLocalTestBootstrapTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('pm-ai.allowed_models', ['gpt-5-nano']);
    }

    public function test_local_bootstrap_is_zero_charge_pmp_only_and_repeatable(): void
    {
        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(0);

        foreach (['pmp_explain', 'pmp_followup'] as $code) {
            $this->assertDatabaseHas('ai_features', [
                'code' => $code,
                'enabled' => true,
                'model' => 'gpt-5-nano',
                'credit_tariff' => 0,
            ]);
            $this->assertSame(1, DB::table('ai_prompt_versions')
                ->where('feature_code', $code)->whereNotNull('published_at')->count());
        }
        $this->assertSame(2, DB::table('ai_features')->count());
        $this->assertDatabaseHas('ai_chat_limit_policies', [
            'plan_code' => 'plus', 'feature_scope' => 'feature:pmp',
            'max_daily' => 10, 'max_cycle' => 50,
            'max_per_conversation' => 10, 'max_concurrent' => 1, 'max_cycle_tokens' => 50000,
        ]);
        $this->assertDatabaseHas('ai_chat_limit_policies', [
            'plan_code' => 'pro', 'feature_scope' => 'feature:pmp',
            'max_daily' => 10, 'max_cycle' => 50,
            'max_per_conversation' => 10, 'max_concurrent' => 1, 'max_cycle_tokens' => 50000,
        ]);
        $this->assertSame(1, DB::table('ai_model_prices')->where('model', 'gpt-5-nano')->count());
        $this->assertSame(1200, (int) DB::table('ai_features')->where('code', 'pmp_explain')
            ->value('max_output_tokens'));
        $this->assertSame(1000, (int) DB::table('ai_features')->where('code', 'pmp_followup')
            ->value('max_output_tokens'));

        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(0);
        $this->assertSame(2, DB::table('ai_features')->count());
        $this->assertSame(2, DB::table('ai_prompt_versions')->count());
        $this->assertSame(2, DB::table('ai_chat_limit_policies')->count());
        $this->assertSame(1, DB::table('ai_model_prices')->count());
    }

    public function test_zero_charge_pmp_message_reserves_chat_quota_without_a_credit_grant(): void
    {
        Queue::fake();
        config()->set('pm-ai.enabled', true);
        config()->set('pm-ai.api_key', 'fake-key-never-called');
        config()->set('pm-ai.global_daily_budget_usd', 1);
        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(0);

        $member = User::factory()->create();
        $plan = DB::table('plans')->insertGetId([
            'code' => 'plus', 'name' => 'Plus', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $planPrice = DB::table('plan_prices')->insertGetId([
            'plan_id' => $plan, 'months' => 1, 'amount_minor' => 1000,
            'currency' => 'BDT', 'version' => 1, 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('subscriptions')->insert([
            'user_id' => $member->id, 'plan_price_id' => $planPrice,
            'status' => 'active', 'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(29), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $question = DB::table('pmp_exam_questions')->insertGetId([
            'code' => 'AI-LOCAL-001', 'domain' => 'People', 'difficulty' => 'Moderate',
            'prompt' => 'A customer requests a scope change. What should you do?',
            'options' => json_encode(['A' => 'Ignore', 'B' => 'Assess impact', 'C' => 'Reject', 'D' => 'Delay']),
            'correct_option' => 'B', 'explanation' => 'Apply integrated change control.',
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $attempt = DB::table('pmp_exam_attempts')->insertGetId([
            'user_id' => $member->id, 'status' => 'completed',
            'question_ids' => json_encode([$question]), 'total_questions' => 1,
            'correct_count' => 0, 'started_at' => now()->subHour(),
            'expires_at' => now()->addHour(), 'finished_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('pmp_exam_attempt_answers')->insert([
            'attempt_id' => $attempt, 'question_id' => $question, 'choice' => 'A',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $receipt = app(AiGateway::class)->submit($member, [
            'feature' => 'pmp_explain', 'client_request_key' => (string) Str::uuid(),
            'subject' => ['attempt_id' => $attempt, 'question_id' => $question],
            'accepted_max_credits' => 0, 'message' => 'Why is B correct?',
        ]);

        $this->assertSame('queued', $receipt['status']);
        $this->assertSame(0, (int) DB::table('ai_requests')
            ->where('request_uuid', $receipt['request_id'])->value('estimated_hold'));
        $this->assertSame(0, DB::table('ai_credit_ledger')->where('user_id', $member->id)->count());
        $this->assertSame(1, (int) DB::table('ai_chat_usage_buckets')
            ->where('user_id', $member->id)->where('scope_key', 'feature:pmp')
            ->where('window_kind', 'day')->value('reserved_count'));
        $this->assertDatabaseCount('ai_pmp_token_allocations', 1);
        $this->assertGreaterThan(0, (int) DB::table('ai_chat_usage_buckets')
            ->where('user_id', $member->id)->where('scope_key', 'feature:pmp')
            ->where('window_kind', 'cycle')->value('reserved_tokens'));
    }

    public function test_local_bootstrap_never_overrides_the_model_allowlist(): void
    {
        config()->set('pm-ai.allowed_models', ['gpt-4.1-mini']);

        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(1);
        $this->assertDatabaseCount('ai_features', 0);
        $this->assertDatabaseCount('ai_model_prices', 0);
    }

    public function test_production_environment_refuses_local_test_bootstrap(): void
    {
        $this->app->instance('env', 'production');

        $this->artisan('pm-ai:setup-pmp-chat', ['--local-test' => true])->assertExitCode(1);
        $this->assertDatabaseCount('ai_features', 0);
    }
}
