<?php

namespace Tests\Feature\AI;

use App\Domain\AI\Providers\OpenAiResponsesProvider;
use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

final class DailyChallengeModerationProviderTest extends TestCase
{
    public function test_malformed_successful_moderation_payload_fails_closed(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'synthetic-test-key');
        config()->set('pm-ai.post_check_api_key', 'synthetic-omni-key');
        config()->set('pm-ai.timeout_seconds', 8);
        Http::fake([
            '*/moderations' => Http::response(['results' => []], 200),
            '*/responses' => Http::response(['status' => 'completed'], 200),
        ]);

        try {
            app(OpenAiResponsesProvider::class)->generate('gpt-5-nano', 'Educational challenge', [
                '_ai_feature_code' => 'scenario_generate',
                'context' => ['topic' => 'Project management'],
            ], app(AiFeatureCatalog::class)->schema('scenario_generate'), 1700);
            $this->fail('Malformed moderation result should block generation.');
        } catch (AiFailure $error) {
            $this->assertSame('MODERATION_UNAVAILABLE', $error->safeCode);
        }
        Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/responses'));
    }
    public function test_daily_challenge_uses_post_check_omni_for_both_safety_checks_and_daily_key_for_responses(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'daily-responses-test-key');
        config()->set('pm-ai.post_check_api_key', 'post-omni-test-key');
        config()->set('pm-ai.api_key', 'exam-test-key');
        config()->set('pm-ai.timeout_seconds', 8);
        Http::fake([
            '*/moderations' => Http::response(['results' => [['flagged' => false]]], 200),
            '*/responses' => Http::response([
                'id' => 'resp_challenge_test', 'model' => 'gpt-5-nano', 'status' => 'completed',
                'output' => [['content' => [['type' => 'output_text',
                    'text' => '{"title":"Project scenario"}']]]],
                'usage' => ['input_tokens' => 70, 'output_tokens' => 30,
                    'input_tokens_details' => ['cached_tokens' => 0]],
            ], 200),
        ]);

        $result = app(OpenAiResponsesProvider::class)->generate('gpt-5-nano', 'Educational challenge', [
            '_ai_feature_code' => 'scenario_generate',
            'context' => ['topic' => 'Project management'],
        ], app(AiFeatureCatalog::class)->schema('scenario_generate'), 1700);

        $this->assertSame('Project scenario', $result['result']['title']);
        Http::assertSentCount(3);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/responses')
            && $request->hasHeader('Authorization', 'Bearer daily-responses-test-key')
            && $request['model'] === 'gpt-5-nano');
        $moderations = collect(Http::recorded())->filter(fn ($pair) =>
            str_ends_with($pair[0]->url(), '/moderations'));
        $this->assertCount(2, $moderations);
        foreach ($moderations as $pair) {
            $this->assertTrue($pair[0]->hasHeader('Authorization', 'Bearer post-omni-test-key'));
            $this->assertSame('omni-moderation-latest', $pair[0]['model']);
        }
    }

    public function test_daily_challenge_member_review_uses_post_check_omni_for_safety(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'daily-responses-test-key');
        config()->set('pm-ai.post_check_api_key', 'post-omni-test-key');
        Http::fake([
            '*/moderations' => Http::response(['results' => [['flagged' => false]]], 200),
            '*/responses' => Http::response([
                'id' => 'resp_review_test', 'model' => 'gpt-5-nano', 'status' => 'completed',
                'output' => [['content' => [['type' => 'output_text',
                    'text' => '{"score":8}']]]],
                'usage' => ['input_tokens' => 80, 'output_tokens' => 25,
                    'input_tokens_details' => ['cached_tokens' => 0]],
            ], 200),
        ]);

        $result = app(OpenAiResponsesProvider::class)->generate('gpt-5-nano', 'Educational evaluation', [
            '_ai_feature_code' => 'daily_challenge_review',
            'context' => ['answer' => 'Discuss delivery risks before accepting a change'],
        ], app(AiFeatureCatalog::class)->schema('daily_challenge_review'), 1000);

        $this->assertSame(8, $result['result']['score']);
        Http::assertSentCount(3);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/responses')
            && $request->hasHeader('Authorization', 'Bearer daily-responses-test-key'));
        $this->assertCount(2, collect(Http::recorded())->filter(fn ($pair) =>
            str_ends_with($pair[0]->url(), '/moderations')
            && $pair[0]->hasHeader('Authorization', 'Bearer post-omni-test-key')));
    }

    public function test_daily_challenge_fails_closed_without_post_check_omni_key(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'daily-responses-test-key');
        config()->set('pm-ai.post_check_api_key', null);
        Http::fake();

        try {
            app(OpenAiResponsesProvider::class)->generate('gpt-5-nano', 'Educational challenge', [
                '_ai_feature_code' => 'daily_challenge_review', 'context' => ['answer' => 'Safe'],
            ], app(AiFeatureCatalog::class)->schema('daily_challenge_review'), 1000);
            $this->fail('A missing Post Check key must block review before sending data.');
        } catch (AiFailure $error) {
            $this->assertSame('MODERATION_UNAVAILABLE', $error->safeCode);
        }
        Http::assertNothingSent();
    }

    public function test_daily_challenge_probe_uses_post_check_omni_key(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'daily-responses-test-key');
        config()->set('pm-ai.post_check_api_key', 'post-omni-test-key');
        Http::fake(['*/moderations' => Http::response([
            'results' => [['flagged' => false]],
        ], 200, ['x-request-id' => 'req_syntheticprobe01'])]);

        $result = app(\App\Domain\DailyChallenge\Services\DailyChallengeModerationProbe::class)->check();
        $this->assertTrue($result['ok']);
        $this->assertSame(200, $result['http_status']);
        Http::assertSentCount(1);
        Http::assertSent(fn ($request) => str_ends_with($request->url(), '/moderations')
            && $request->hasHeader('Authorization', 'Bearer post-omni-test-key'));
    }

    public function test_daily_challenge_rejects_omni_denial_without_calling_responses(): void
    {
        config()->set('pm-ai.daily_challenge_api_key', 'daily-responses-test-key');
        config()->set('pm-ai.post_check_api_key', 'post-omni-test-key');
        Http::fake([
            '*/moderations' => Http::response(['error' => ['message' => 'Forbidden']], 403),
            '*/responses' => Http::response(['status' => 'completed'], 200),
        ]);

        try {
            app(OpenAiResponsesProvider::class)->generate('gpt-5-nano', 'Educational challenge', [
                '_ai_feature_code' => 'scenario_generate', 'context' => ['topic' => 'Project management'],
            ], app(AiFeatureCatalog::class)->schema('scenario_generate'), 1700);
            $this->fail('A denied Omni moderation must block generation.');
        } catch (AiFailure $error) {
            $this->assertSame('MODERATION_UNAVAILABLE', $error->safeCode);
        }
        Http::assertNotSent(fn ($request) => str_ends_with($request->url(), '/responses'));
    }

}
