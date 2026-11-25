<?php

namespace App\Console\Commands;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiEditorialService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\DailyChallenge\Services\DailyChallengeModerationProbe;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Throwable;

/** Recovery is per future slot, opt-in, audited, and refuses ambiguous provider outcomes. */
final class RecoverDailyChallengeDraft extends Command
{
    protected $signature = 'daily-challenge:recover-draft
        {date : YYYY-MM-DD in Asia/Dhaka}
        {--actor= : Authorized AI editorial administrator ID}
        {--reason= : Audit reason (8-500 characters)}
        {--execute : Actually recover and submit exactly one generation request}';

    protected $description = 'Safely recover one exhausted future Daily Challenge draft (dry run by default)';

    private const RETRYABLE_ERRORS = [
        'MODERATION_UNAVAILABLE', 'PROVIDER_UNAVAILABLE',
        'QUEUE_DELIVERY_FAILED', 'QUEUE_JOB_FAILED', 'AI_PROCESSING_FAILED',
    ];

    public function handle(AiEditorialService $editorial, AiAdminAccess $access,
        DailyChallengeModerationProbe $probe, DailyChallengeSettings $settings): int
    {
        $date = (string) $this->argument('date');
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $this->error('Expected YYYY-MM-DD.');
            return self::FAILURE;
        }
        try {
            $localDate = Carbon::createFromFormat('!Y-m-d', $date, 'Asia/Dhaka');
            if (! $localDate || $localDate->format('Y-m-d') !== $date) {
                throw new \InvalidArgumentException('Invalid date');
            }
        } catch (Throwable) {
            $this->error('Invalid publication date.');
            return self::FAILURE;
        }
        // Today's slot is eligible only while its scheduled publication time remains ahead.
        // The check below also rejects today's slot after cutoff; never backfill past dates.
        if ($date < now('Asia/Dhaka')->toDateString()) {
            $this->error('Past Dhaka dates cannot be recovered. Today is allowed only before publication time.');
            return self::FAILURE;
        }
        $policy = $settings->get();
        [$hour, $minute] = array_map('intval', explode(':', $policy->publish_time));
        $publishAt = $localDate->setTime($hour, $minute)->utc();
        if ($publishAt->lessThanOrEqualTo(now())) {
            $this->error('The recalculated publication time is already past.');
            return self::FAILURE;
        }

        $draft = DB::table('ai_editorial_drafts')
            ->where('feature', 'scenario_generate')->where('slot_key', 'daily-scenario:'.$date)->first();
        $error = $this->validateDraft($draft, $date);
        if ($error !== null) {
            $this->error($error);
            return self::FAILURE;
        }

        $this->line(sprintf('Draft #%d, date=%s, attempts=%d, new publication UTC=%s',
            $draft->id, $date, $draft->generation_attempts, $publishAt->format('Y-m-d H:i:s')));
        if (! $this->option('execute')) {
            $this->comment('DRY RUN: no database changes or API requests. Add --execute, --actor, and --reason after access is restored.');
            return self::SUCCESS;
        }

        $actor = $this->authorizedActor();
        $reason = (string) $this->option('reason');
        if (! $actor || mb_strlen(trim($reason)) < 8 || mb_strlen($reason) > 500) {
            $this->error('An active, verified editorial admin --actor and an audit --reason (8-500 characters) are required.');
            return self::FAILURE;
        }
        if (! DB::table('ai_admin_permissions')->where('user_id', $actor->id)
            ->where('permission', 'ai.manage_editorial')->exists()) {
            $this->error('The administrator lacks ai.manage_editorial permission.');
            return self::FAILURE;
        }
        $access->authorize($actor, 'ai.manage_editorial');
        if (! config('pm-ai.enabled') || ! $policy->enabled || ! $settings->isReady()) {
            $this->error('Daily Challenge AI is not enabled or ready.');
            return self::FAILURE;
        }

        $feature = DB::table('ai_features')->where('code', 'scenario_generate')
            ->where('enabled', true)->where('model', 'gpt-5-nano')->first();
        $promptReady = $feature && DB::table('ai_prompt_versions')
            ->where('feature_code', 'scenario_generate')
            ->where('version', $feature->prompt_version)->whereNotNull('published_at')->exists();
        $priceReady = DB::table('ai_model_prices')->where('model', 'gpt-5-nano')
            ->where('effective_from', '<=', now())->exists();
        if (! $promptReady || ! $priceReady || (float) app(\App\Domain\AI\Services\AiRuntimeSettings::class)->budget('global_daily_budget_usd') <= 0
            || (float) app(\App\Domain\AI\Services\AiRuntimeSettings::class)->budget('editorial_budget_usd') <= 0) {
            $this->error('Generation feature, published prompt, model price, or budget is not ready.');
            return self::FAILURE;
        }

        $capability = $probe->check();
        if (! $capability['ok']) {
            $this->error('Access is still blocked: '.$capability['code']
                .' request_id='.($capability['request_id'] ?? 'n/a').'. Nothing was reset.');
            return self::FAILURE;
        }

        try {
            // Reset and submit under one transaction. If admission or budget reservation
            // fails, leave the exhausted draft untouched and do not write a recovery audit.
            $result = DB::transaction(function () use ($date, $publishAt, $actor, $reason, $access, $editorial): array {
                $current = DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
                    ->where('slot_key', 'daily-scenario:'.$date)->lockForUpdate()->first();
                $error = $this->validateDraft($current, $date);
                if ($error !== null) {
                    throw new \RuntimeException('DRAFT_CHANGED_OR_INELIGIBLE');
                }
                DB::table('ai_editorial_drafts')->where('id', $current->id)->update([
                    'status' => 'queued', 'request_id' => null, 'reviewed_by' => null,
                    'generation_attempts' => 0, 'publication_at' => $publishAt,
                    'updated_at' => now(),
                ]);
                $access->audit($actor->id, 'daily_challenge.draft.recover',
                    'ai_editorial_drafts', (int) $current->id,
                    ['status' => $current->status, 'attempts' => $current->generation_attempts,
                        'last_request_id' => $current->request_id],
                    ['status' => 'queued', 'attempts' => 0,
                        'publication_at' => $publishAt->format('Y-m-d H:i:s')], $reason);
                return $editorial->queueScenarioSlot($date);
            }, 3);
        } catch (AiFailure $failure) {
            $this->error('Recovery admission failed: '.$failure->safeCode.'. Inspect the draft before trying again.');
            return self::FAILURE;
        } catch (Throwable) {
            $this->error('Recovery did not complete. Inspect the draft and AI requests before any retry.');
            return self::FAILURE;
        }

        $this->info('Recovery request submitted; inspect the new AI request before publishing.');
        $this->line('Draft ID: '.($result['draft_id'] ?? 'n/a'));
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

    private function validateDraft(?object $draft, string $date): ?string
    {
        if (! $draft || $draft->status !== 'failed' || (int) $draft->generation_attempts < 3) {
            return 'The selected slot is not an exhausted failed draft.';
        }
        if ($draft->payload_encrypted !== null || $draft->published_at !== null
            || DB::table('scenarios')->where('daily_slot', $date)->exists()) {
            return 'This slot has generated or published content; regeneration is unsafe.';
        }
        if ($draft->request_id === null) {
            return 'No completed historical request is linked to this draft.';
        }
        // Prevent a second manual reset after the one authorized recovery; do not
        // turn provider outages into an unbounded series of paid generation attempts.
        if (DB::table('ai_audit_events')
            ->where('action', 'daily_challenge.draft.recover')
            ->where('subject_type', 'ai_editorial_drafts')
            ->where('subject_id', $draft->id)->exists()) {
            return 'This draft has already been manually recovered once; investigate before further retries.';
        }
        $requests = DB::table('ai_requests')->where('feature_code', 'scenario_generate')
            ->where('subject_type', 'editorial_draft')->where('subject_id', $draft->id);
        if ((clone $requests)->whereNotIn('status', ['failed', 'cancelled'])->exists()) {
            return 'An in-flight, completed, or ambiguous prior request prevents recovery.';
        }
        $latest = (clone $requests)->orderByDesc('id')->first(['id', 'status', 'error_code']);
        if (! $latest || (int) $latest->id !== (int) $draft->request_id
            || $latest->status !== 'failed' || ! in_array($latest->error_code, self::RETRYABLE_ERRORS, true)) {
            return 'The last request is not an explicitly retryable terminal failure.';
        }
        return null;
    }
}
