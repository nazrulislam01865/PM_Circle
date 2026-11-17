<?php

namespace App\Domain\DailyChallenge\Jobs;

use App\Domain\AI\Services\AiGateway;
use App\Domain\AI\Support\AiFailure;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Models\ScenarioResponse;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;
use Throwable;

final class QueueDailyChallengeReview implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public readonly int $responseId) {}

    public function handle(AiGateway $gateway, DailyChallengeSettings $policy): void
    {
        $response = ScenarioResponse::query()->with('user')->find($this->responseId);
        if (! $response || $response->parent_id || ! $response->user
            || $response->ai_review_status !== 'queued') {
            return;
        }
        $settings = $policy->get();
        if (! $settings->enabled || ! $settings->auto_review || ! $policy->isReady()) {
            $this->failReview();
            return;
        }
        try {
            $gateway->submit($response->user, [
                'client_request_key' => Uuid::uuid5(Uuid::NAMESPACE_DNS,
                    'pm-circle:daily-challenge-response:'.$response->id)->toString(),
                'feature' => 'daily_challenge_review',
                'subject' => ['response_id' => $response->id],
                'accepted_max_credits' => 0,
            ]);
        } catch (AiFailure $e) {
            $this->failReview();
            // Fail closed. Community content must remain saved if provider admission is unavailable.
            report(new \RuntimeException('Daily Challenge review admission rejected: '.$e->safeCode));
        } catch (Throwable $e) {
            // Transient infrastructure failures may be retried without duplicate AI requests.
            throw $e;
        }
    }

    public function failed(?Throwable $exception): void
    {
        $this->failReview();
    }

    private function failReview(): void
    {
        DB::table('scenario_responses')->where('id', $this->responseId)
            ->where('ai_review_status', 'queued')->whereNull('ai_score')
            ->update(['ai_review_status' => 'failed', 'updated_at' => now()]);
    }
}
