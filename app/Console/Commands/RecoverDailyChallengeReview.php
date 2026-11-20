<?php

namespace App\Console\Commands;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\DailyChallenge\Jobs\QueueDailyChallengeReview;
use App\Domain\DailyChallenge\Services\DailyChallengeModerationProbe;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/** Explicit, audited recovery of a single failed educational review; no user content is logged. */
final class RecoverDailyChallengeReview extends Command
{
    protected $signature = 'daily-challenge:recover-review
        {response : Failed scenario response ID}
        {--actor= : Authorized AI editorial administrator ID}
        {--reason= : Audit reason (8-500 characters)}
        {--execute : Actually queue one new review request}';

    protected $description = 'Safely retry a failed Daily Challenge member review (dry run by default)';

    private const RETRYABLE_ERRORS = [
        'MODERATION_UNAVAILABLE', 'PROVIDER_UNAVAILABLE',
        'QUEUE_DELIVERY_FAILED', 'QUEUE_JOB_FAILED', 'AI_PROCESSING_FAILED',
    ];

    public function handle(AiAdminAccess $access, DailyChallengeModerationProbe $probe,
        DailyChallengeSettings $settings): int
    {
        $responseId = (string) $this->argument('response');
        if (! ctype_digit($responseId) || (int) $responseId < 1) {
            $this->error('Response ID must be a positive integer.');
            return self::FAILURE;
        }
        $id = (int) $responseId;
        $response = DB::table('scenario_responses')->where('id', $id)->first();
        $error = $this->validateResponse($response);
        if ($error !== null) {
            $this->error($error);
            return self::FAILURE;
        }

        $this->line('Response #'.$id.' is eligible for a single controlled recovery.');
        if (! $this->option('execute')) {
            $this->comment('DRY RUN: no database changes or API requests.');
            return self::SUCCESS;
        }

        $actor = $this->authorizedActor();
        $reason = (string) $this->option('reason');
        if (! $actor || mb_strlen(trim($reason)) < 8 || mb_strlen($reason) > 500) {
            $this->error('An active, verified editorial admin --actor and audit --reason are required.');
            return self::FAILURE;
        }
        if (! DB::table('ai_admin_permissions')->where('user_id', $actor->id)
            ->where('permission', 'ai.manage_editorial')->exists()) {
            $this->error('The administrator lacks ai.manage_editorial permission.');
            return self::FAILURE;
        }
        $access->authorize($actor, 'ai.manage_editorial');
        $policy = $settings->get();
        if (! $policy->enabled || ! $policy->auto_review || ! $settings->isReady()) {
            $this->error('Automatic Daily Challenge reviews are not enabled or ready.');
            return self::FAILURE;
        }

        $capability = $probe->check();
        if (! $capability['ok']) {
            $this->error('Access is still blocked: '.$capability['code']
                .' request_id='.($capability['request_id'] ?? 'n/a').'. Nothing was requeued.');
            return self::FAILURE;
        }

        try {
            DB::transaction(function () use ($id, $actor, $reason, $access): void {
                $response = DB::table('scenario_responses')->where('id', $id)->lockForUpdate()->first();
                if ($this->validateResponse($response) !== null) {
                    throw new \RuntimeException('REVIEW_CHANGED_OR_INELIGIBLE');
                }
                DB::table('scenario_responses')->where('id', $id)->update([
                    'ai_review_status' => 'queued', 'updated_at' => now(),
                ]);
                $access->audit($actor->id, 'daily_challenge.review.recover',
                    'scenario_responses', $id,
                    ['ai_review_status' => 'failed'], ['ai_review_status' => 'queued'], $reason);
            }, 3);
        } catch (Throwable) {
            // A concurrent authorized operation may already have queued the response.
            // Never revert someone else's queued review after a transaction conflict.
            $this->error('Recovery admission failed; inspect the current response state.');
            return self::FAILURE;
        }
        try {
            QueueDailyChallengeReview::dispatch($id)->onQueue(config('pm-ai.queue'));
        } catch (Throwable) {
            // Redis delivery may be ambiguous. Preserve the queued row rather than
            // making it eligible for a second simultaneous administrator recovery.
            $this->error('Queue dispatch failed or is uncertain. Inspect queue and response before retrying.');
            return self::FAILURE;
        }

        $this->info('Review recovery dispatched; inspect the NEW request and resulting score.');
        return self::SUCCESS;
    }

    private function authorizedActor(): ?User
    {
        $input = $this->option('actor');
        if (! is_string($input) || ! ctype_digit($input) || (int) $input < 1) {
            return null;
        }
        $actor = User::find((int) $input);
        return $actor && $actor->is_admin && $actor->status === 'active'
            && $actor->email_verified_at !== null ? $actor : null;
    }

    private function validateResponse(?object $response): ?string
    {
        if (! $response || $response->ai_review_status !== 'failed'
            || $response->ai_score !== null || $response->parent_id !== null) {
            return 'The response is not a failed, unscored top-level answer.';
        }
        $scenario = DB::table('scenarios')->where('id', $response->scenario_id)
            ->where('ai_generated', true)->whereNotNull('daily_slot')
            ->whereIn('status', ['published', 'closed'])->exists();
        if (! $scenario || ! DB::table('users')->where('id', $response->user_id)->exists()) {
            return 'The response does not belong to an accessible AI-generated daily challenge.';
        }
        if (DB::table('scenario_ai_reviews')->where('response_id', $response->id)->exists()) {
            return 'A scored review already exists; do not generate another review.';
        }
        $requests = DB::table('ai_requests')->where('feature_code', 'daily_challenge_review')
            ->where('subject_type', 'scenario_response')->where('subject_id', $response->id);
        if ((clone $requests)->whereNotIn('status', ['failed', 'cancelled'])->exists()) {
            return 'An in-flight, completed, or ambiguous review blocks recovery.';
        }
        $previous = (clone $requests)->orderByDesc('id')->first(['status', 'error_code']);
        if ($previous && ($previous->status !== 'failed'
            || ! in_array($previous->error_code, self::RETRYABLE_ERRORS, true))) {
            return 'The prior review failure is not safely retryable.';
        }
        if ((clone $requests)->count() >= 4) {
            return 'The manual review recovery limit has been reached.';
        }
        return null;
    }
}
