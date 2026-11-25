<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Services\AiDirectUsage;
use App\Domain\AI\Support\AiFailure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class AiWorkspaceCompletionTest extends TestCase
{
    use RefreshDatabase;

    private const PRICE = ['input' => 1, 'cached' => 1, 'output' => 1];
    private const KEY = ['ref' => 'credential:env:resume_extract_api_key', 'limit' => null];

    public function test_monthly_limit_reserves_and_settles_across_days(): void
    {
        config()->set('pm-ai.global_daily_budget_usd', 10);
        config()->set('pm-ai.global_monthly_budget_usd', .15);
        $this->travelTo(now('UTC')->startOfMonth()->addDays(2));
        $usage = app(AiDirectUsage::class);
        $id = $usage->begin('resume_extract', 'gpt-4o-mini', self::PRICE, .10, self::KEY);
        $usage->settle($id, 50000, 50000);
        $this->travel(1)->days();
        try {
            $usage->begin('resume_extract', 'gpt-4o-mini', self::PRICE, .10, self::KEY);
            $this->fail('Monthly cap must reject the second reservation.');
        } catch (AiFailure $failure) {
            $this->assertSame('MONTHLY_AI_BUDGET_REACHED', $failure->safeCode);
        }
        $this->assertDatabaseCount('ai_requests', 1);
        $this->assertEqualsWithDelta(.10, (float) DB::table('ai_budget_usage')->where('scope', 'global-month')->value('spent_usd'), .000000001);
        $this->assertEqualsWithDelta(0, (float) DB::table('ai_budget_usage')->where('scope', 'global-month')->value('reserved_usd'), .000000001);
    }

    public function test_feature_cap_and_unknown_outcome_keep_reservations(): void
    {
        config()->set('pm-ai.global_daily_budget_usd', 10);
        config()->set('pm-ai.global_monthly_budget_usd', 10);
        DB::table('ai_workspace_feature_routes')->insert(['feature_code' => 'resume_extract', 'daily_usd' => .10, 'strategy' => 'primary_only', 'created_at' => now(), 'updated_at' => now()]);
        $usage = app(AiDirectUsage::class);
        $id = $usage->begin('resume_extract', 'gpt-4o-mini', self::PRICE, .08, self::KEY);
        $usage->unknown($id);
        try {
            $usage->begin('resume_extract', 'gpt-4o-mini', self::PRICE, .04, self::KEY);
            $this->fail('Unknown provider outcome must retain its feature reservation.');
        } catch (AiFailure $failure) {
            $this->assertSame('FEATURE_AI_BUDGET_REACHED', $failure->safeCode);
        }
        $this->assertDatabaseCount('ai_requests', 1);
        $this->assertDatabaseHas('ai_requests', ['id' => $id, 'status' => 'provider_status_unknown']);
        $this->assertEqualsWithDelta(.08, (float) DB::table('ai_budget_usage')->where('scope', 'feature:resume_extract')->value('reserved_usd'), .000000001);
        $this->assertEqualsWithDelta(.08, (float) DB::table('ai_budget_usage')->where('scope', self::KEY['ref'])->value('reserved_usd'), .000000001);
    }
}
