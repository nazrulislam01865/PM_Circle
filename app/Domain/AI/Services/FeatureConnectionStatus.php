<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Jobs\ExecuteAiRequest;
use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/** Feature diagnostics use the production keys and never expose credentials or create user content. */
final class FeatureConnectionStatus
{
    public const MEMBER_REVIEW_OPERATIONS = ['resume_analyze', 'resume_rewrite', 'interview_answer_review'];

    private function key(string $feature): ?string
    {
        return match ($feature) {
            'daily-challenge' => app(AiFeatureRouting::class)->primarySecret('scenario_generate', 'daily_challenge_api_key'),
            'daily-challenge-review' => app(AiFeatureRouting::class)->primarySecret('daily_challenge_review', 'daily_challenge_api_key'),
            'pmp' => app(AiFeatureRouting::class)->primarySecret('pmp_explain', 'api_key'),
            'feed-moderation' => app(AiFeatureRouting::class)->primarySecret('feed_moderation', 'post_check_api_key'),
            default => app(AiFeatureRouting::class)->primarySecret($this->featureCode($feature), 'api_key'),
        };
    }

    private function verification(string $feature): string
    {
        return $feature !== 'feed-moderation' ? 'generation'
            : (config('pm-ai.post_check_provider') === 'omni' ? 'moderation' : 'responses');
    }

    private function fingerprint(string $feature, ?string $model): string
    {
        return hash_hmac('sha256', json_encode([$feature, $model, $this->key($feature),
            $this->verification($feature), app(AiFeatureRouting::class)->primaryAccounting(match ($feature) { 'daily-challenge' => 'scenario_generate', 'daily-challenge-review' => 'daily_challenge_review', 'pmp' => 'pmp_explain', 'feed-moderation' => 'feed_moderation', default => $this->featureCode($feature) }, match ($feature) { 'daily-challenge', 'daily-challenge-review' => 'daily_challenge_api_key', 'pmp' => 'api_key', 'feed-moderation' => 'post_check_api_key', default => 'api_key' }), config('pm-ai.enabled'), config('pm-ai.endpoint'), in_array($model, app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), true),
            in_array($feature, ['daily-challenge', 'daily-challenge-review'], true) ? [app(\App\Domain\AI\Services\AiFeatureRouting::class)->moderationSecret(), config('pm-ai.editorial_enabled'), app()->environment('local') && config('pm-ai.daily_challenge_skip_generation_moderation')] : null,
            in_array($feature, ['pmp', 'pmp-followup'], true) ? config('pm-ai.pmp_external_moderation') : null,
            $feature === 'feed-moderation' ? config('pm-ai.post_check_enabled') : null,
        ]), (string) config('app.key'));
    }

    private function cacheKey(string $feature, ?string $model): string
    {
        return 'pm:ai-settings:v2:'.$this->fingerprint($feature, $model);
    }

    private function base(string $feature, ?string $model): array
    {
        $operation = match ($feature) { 'daily-challenge' => 'scenario_generate', 'daily-challenge-review' => 'daily_challenge_review', 'pmp' => 'pmp_explain', 'feed-moderation' => 'feed_moderation', default => $this->featureCode($feature) };
        $slot = AiFeatureRouting::slot($operation);
        $routing = app(AiFeatureRouting::class);
        $runtime = app(AiRuntimeSettings::class);
        try {
            $available = $routing->selectPrimary($operation, $slot);
            $name = $available ? $runtime->credentialName($slot) : null;
            $account = $available ? $runtime->credentialAccounting($slot) : null;
        } finally { $runtime->clearCredentialSelection($slot); }
        $configured = $available && filled($model);
        $health = app(AiWorkspaceCredentials::class)->healthFor($account, $slot);
        return [...$health, 'operation' => $operation, 'provider' => 'openai', 'label' => 'OpenAI', 'model' => $model, 'configured' => $configured,
            'routing_target' => match ($feature) { 'daily-challenge', 'daily-challenge-review' => 'daily_challenge_api_key', 'pmp' => 'api_key', 'feed-moderation' => 'post_check_api_key', default => 'api_key' },
            'credential_name' => $name,
            'connected' => false, 'checked_at' => null, 'pending' => false, 'verification' => $this->verification($feature),
            'code' => $configured ? 'NOT_TESTED' : 'PROVIDER_NOT_CONFIGURED',
            'message' => $configured ? 'Credential assigned. Test this operation to verify the model and moderation.' : 'Select and save a compatible API credential, then test the operation.'];
    }

    public function status(string $feature, ?string $model, bool $featureEnabled = true): array
    {
        $base = $this->base($feature, $model);
        if (! $base['configured']) return $base;
        if (! $featureEnabled || ! config('pm-ai.enabled') || ($feature === 'daily-challenge' && ! config('pm-ai.editorial_enabled')) || ($feature === 'feed-moderation' && ! config('pm-ai.post_check_enabled'))) {
            return [...$this->result($feature, $model, 'FEATURE_DISABLED'), 'checked_at' => null];
        }
        $cached = Cache::get($this->cacheKey($feature, $model)) ?? [];
        $health = $base['credential_health_code'];
        if ($health && ! in_array($health, ['OPERATION_VERIFIED', 'RUNTIME_RECOVERED'], true)
            && $base['credential_checked_at'] && (! isset($cached['checked_at']) || (($cached['connected'] ?? false) && \Illuminate\Support\Carbon::parse($base['credential_checked_at'])->gt(\Illuminate\Support\Carbon::parse($cached['checked_at']))))) {
            return [...$base, 'code' => $health, 'message' => 'Latest credential check: '.str_replace('_', ' ', $health).'. Test the saved operation after resolving the issue.'];
        }
        return [...$base, ...$cached, ...array_intersect_key($base, array_flip(['credential_name', 'credential_health_code', 'credential_checked_at']))];
    }

    private function result(string $feature, ?string $model, ?string $code, ?string $checkedAt = null): array
    {
        $verification = $this->verification($feature);
        $message = match ($code) {
            null => match ($verification) {
                'generation' => 'Primary model generation and configured moderation policy verified successfully.',
                'moderation' => 'Omni moderation verified successfully with a synthetic sample.',
                default => 'Responses endpoint and configured moderation preflight verified with a budgeted synthetic sample.',
            },
            'FEATURE_DISABLED' => 'Enable the AI gateway and relevant feature before testing.',
            'MODEL_NOT_ALLOWLISTED' => 'Configure an approved model in the server allowlist.',
            'MODEL_PRICE_MISSING' => 'Publish an approved price for this model before running a test.',
            'BUDGET_NOT_CONFIGURED' => 'Configure the required AI budgets before testing.',
            'DAILY_AI_BUDGET_REACHED', 'MONTHLY_AI_BUDGET_REACHED', 'FEATURE_AI_BUDGET_REACHED' => 'AI spending limit reached. No paid diagnostic request was sent.',
            'PROVIDER_NOT_CONFIGURED' => 'No usable primary credential is assigned. Select a tested credential from AI Workspace.',
            'PROVIDER_AUTH_FAILED', 'POST_CHECK_KEY_DENIED' => 'API authentication or permission denied. Check the dedicated key.',
            'PROVIDER_PERMISSION_DENIED' => 'API permission denied. Check key access to the selected model.',
            'PROVIDER_MODEL_NOT_FOUND' => 'Model unavailable for this key.',
            'PROVIDER_QUOTA_EXHAUSTED' => 'Provider quota or billing limit reached.',
            'PROVIDER_RATE_LIMITED', 'POST_CHECK_RATE_LIMITED', 'MODERATION_RATE_LIMITED' => 'Provider rate limit reached. Try again later.',
            'MODERATION_UNAVAILABLE', 'MODERATION_PERMISSION_DENIED', 'MODERATION_AUTH_FAILED' => 'Required moderation is unavailable. Check the moderation key and permissions.',
            'PROVIDER_STATUS_UNKNOWN' => 'Provider status is uncertain. Check AI usage reconciliation before retrying.',
            'TEST_TIMEOUT' => 'Connection test timed out. Check the AI queue worker.',
            'QUEUE_JOB_FAILED' => 'The AI queue job failed. Check the queue worker and Redis connection.',
            'TEST_PENDING' => 'A diagnostic is already running. Wait for the current test to finish.',
            'CONFIGURATION_CHANGED' => 'Connection configuration changed. Run a new test.',
            default => 'Connection test did not complete successfully. Check the AI configuration and worker logs.',
        };
        return [...$this->base($feature, $model), 'connected' => $code === null, 'code' => $code, 'message' => $message,
            'checked_at' => $checkedAt ?? now()->toIso8601String()];
    }

    private function record(string $feature, ?string $model, ?string $code): array
    {
        $result = $this->result($feature, $model, $code);
        Cache::put($this->cacheKey($feature, $model), $result, now()->addMinutes(10));
        return $result;
    }

    private function pending(string $feature, ?string $model, string $uuid): array
    {
        return [...$this->result($feature, $model, 'TEST_PENDING'), 'checked_at' => null, 'pending' => true, 'request_id' => $uuid];
    }

    private function featureCode(string $feature): string
    {
        return match ($feature) { 'daily-challenge' => 'scenario_generate', 'daily-challenge-review' => 'daily_challenge_review', 'pmp' => 'pmp_explain', 'pmp-followup' => 'pmp_followup', default => in_array($feature, self::MEMBER_REVIEW_OPERATIONS, true) ? $feature : throw new \InvalidArgumentException('Unknown diagnostic operation') };
    }

    public function test(string $feature, ?string $model, int $actorId): array
    {
        $base = $this->base($feature, $model);
        if (! $base['configured']) return $base;
        if ($feature === 'feed-moderation') return $this->testFeed($model, $actorId);
        if (! config('pm-ai.enabled') || ($feature === 'daily-challenge' && ! config('pm-ai.editorial_enabled'))) {
            return $this->record($feature, $model, 'FEATURE_DISABLED');
        }
        if (! in_array($model, app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), true) || str_starts_with($model, 'gemini-')) {
            return $this->record($feature, $model, 'MODEL_NOT_ALLOWLISTED');
        }
        try {
            return DB::transaction(function () use ($feature, $model, $actorId): array {
                $code = $this->featureCode($feature);
                $settings = DB::table('ai_features')->where('code', $code)->lockForUpdate()->first();
                if (! $settings || ! $settings->enabled || $settings->model !== $model) {
                    throw new AiFailure('FEATURE_DISABLED', 503);
                }
                $fingerprint = $this->fingerprint($feature, $model);
                $existing = DB::table('ai_requests')->where('subject_type', 'feature_connection_test')
                    ->where('subject_id', $actorId)->where('feature_code', $code)->where('client_key', $fingerprint)
                    ->where(fn ($query) => $query->where(fn ($pending) => $pending->whereIn('status', ['queued', 'running'])->where('lease_until', '>', now()))
                        ->orWhere('status', 'provider_status_unknown'))->latest('id')->first();
                if ($existing) return $existing->status === 'provider_status_unknown'
                    ? $this->result($feature, $model, 'PROVIDER_STATUS_UNKNOWN') : $this->pending($feature, $model, $existing->request_uuid);
                $price = DB::table('ai_model_prices')->where('model', $model)->where('effective_from', '<=', now())->orderByDesc('effective_from')->first();
                if (! $price) throw new AiFailure('MODEL_PRICE_MISSING', 503);
                $prices = ['input' => $price->input_usd_per_m, 'cached' => $price->cached_input_usd_per_m, 'output' => $price->output_usd_per_m];
                $context = ['context' => ['diagnostic' => true, 'sample' => 'A project team reviewed a schedule.'], 'message' => null];
                if (in_array($feature, ['pmp', 'pmp-followup'], true)) {
                    $context['subject_type'] = 'pmp_attempt_question';
                    $context['context']['question'] = 'What should a project manager review to understand the planned delivery dates?';
                    $context['context']['options'] = ['A' => 'Project schedule', 'B' => 'Office seating plan'];
                    $context['context']['correct_option'] = 'A';
                    $context['message'] = 'Explain why the project schedule is relevant.';
                }
                $instructions = $feature === 'daily-challenge'
                    ? 'Internal connection diagnostic only. Return a very short fictional project scenario with all required JSON fields. Include exactly two known facts, one topic, and two rubric criteria with unique lowercase keys and 5 points each. Do not publish anything.'
                    : 'Internal connection diagnostic only. Explain the synthetic completed question briefly in the required explanation field and set nextStep to null.';
                if ($feature === 'pmp-followup') $instructions = 'Internal connection diagnostic only. Answer the synthetic question briefly in the required answer field and set nextStep to null.';
                if ($feature === 'daily-challenge-review') {
                    $criteria = [['key' => 'risk', 'description' => 'Identify a delivery risk.', 'max_points' => 10]];
                    $context = ['context' => ['scenario' => 'A fictional team faces a schedule delay.', 'answer' => 'Identify the risk and assign an owner.', 'rubric' => $criteria], 'rubric' => ['criteria' => $criteria, 'max_score' => 10], 'message' => null];
                    $instructions = 'Internal diagnostic only. Evaluate the fictional answer using the supplied rubric. Return exactly one criterion with key risk and integer points from zero to ten, nonempty evidence, strengths, gaps, next_actions and disclaimer. Do not update any learner response.';
                }
                if (in_array($feature, self::MEMBER_REVIEW_OPERATIONS, true)) {
                    $context = $feature === 'interview_answer_review'
                        ? ['context' => ['question' => 'How would you manage a project risk?', 'candidate_answer' => 'I would identify a risk owner and track the mitigation plan.', 'role' => 'Project Manager', 'industry' => 'Software'], 'message' => null]
                        : ['context' => ['resume_excerpt' => 'Coordinated a fictional project schedule and weekly risk reviews.', 'section' => 'Professional summary'], 'message' => null];
                    $instructions = 'Internal connection diagnostic only. Use the fictional data to return brief, constructive educational feedback in every required schema field. Do not invent personal details or change scores.';
                }
                $uuid = (string) Str::uuid();
                $maxOutput = in_array($feature, self::MEMBER_REVIEW_OPERATIONS, true) ? (int) $settings->max_output_tokens : 1024;
                $id = DB::table('ai_requests')->insertGetId([
                    'request_uuid' => $uuid, 'feature_code' => $code, 'subject_type' => 'feature_connection_test',
                    'subject_id' => $actorId, 'client_key' => $fingerprint, 'status' => 'queued', 'model' => $model, 'provider' => 'openai',
                    'prompt_version' => $settings->prompt_version, 'max_output_tokens' => $maxOutput,
                    'payload_encrypted' => Crypt::encryptString(json_encode(['context' => $context, 'instructions' => $instructions], JSON_THROW_ON_ERROR)),
                    'model_price_snapshot' => json_encode([...$prices, 'price_id' => $price->id], JSON_THROW_ON_ERROR),
                    'lease_until' => now()->addSeconds((int) config('pm-ai.lease_seconds')), 'created_at' => now(), 'updated_at' => now(),
                ]);
                app(AiBudgetService::class)->reserve($id, $code, $context, $prices, $maxOutput);
                DB::afterCommit(function () use ($id, $feature): void {
                    try {
                        ExecuteAiRequest::dispatch($id)->onQueue(config($feature === 'daily-challenge' ? 'pm-ai.editorial_queue' : 'pm-ai.queue'));
                    } catch (Throwable) {
                        app(AiExecutionService::class)->fail($id, 'QUEUE_JOB_FAILED');
                    }
                });
                return $this->pending($feature, $model, $uuid);
            }, 3);
        } catch (AiFailure $failure) {
            return $this->record($feature, $model, $failure->safeCode);
        }
    }

    public function assertCurrent(object $request, object $settings): void
    {
        $feature = match ($request->feature_code) { 'scenario_generate' => 'daily-challenge', 'daily_challenge_review' => 'daily-challenge-review', 'pmp_explain' => 'pmp', 'pmp_followup' => 'pmp-followup', default => $request->feature_code };
        if (! $settings->enabled || ! config('pm-ai.enabled') || ($feature === 'daily-challenge' && ! config('pm-ai.editorial_enabled'))
            || $settings->model !== $request->model || ! in_array($request->model, app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), true)
            || $request->client_key !== $this->fingerprint($feature, $request->model)) {
            throw new AiFailure('CONFIGURATION_CHANGED', 409);
        }
    }

    public function refreshCompleted(object $request): void
    {
        $feature = match ($request->feature_code) { 'scenario_generate' => 'daily-challenge', 'daily_challenge_review' => 'daily-challenge-review', 'pmp_explain' => 'pmp', 'pmp_followup' => 'pmp-followup', default => $request->feature_code };
        $this->testStatus($feature, $request->request_uuid, (int) $request->subject_id);
    }

    public function testStatus(string $feature, string $uuid, int $actorId): array
    {
        abort_if($feature === 'feed-moderation', 404);
        $row = DB::table('ai_requests')->where('request_uuid', $uuid)->where('subject_type', 'feature_connection_test')
            ->where('subject_id', $actorId)->where('feature_code', $this->featureCode($feature))->first();
        abort_unless($row, 404);
        $settings = DB::table('ai_features')->where('code', $row->feature_code)->first(['model', 'enabled']);
        $model = $settings?->model;
        if (! $settings?->enabled || $row->model !== $model || $row->client_key !== $this->fingerprint($feature, $row->model)) {
            return $this->result($feature, $model, 'CONFIGURATION_CHANGED');
        }
        if (in_array($row->status, ['queued', 'running'], true) && $row->lease_until && now()->lt(\Illuminate\Support\Carbon::parse($row->lease_until))) {
            return $this->pending($feature, $row->model, $uuid);
        }
        $code = match ($row->status) {
            'completed' => null, 'provider_status_unknown' => 'PROVIDER_STATUS_UNKNOWN',
            'queued', 'running' => 'TEST_TIMEOUT', default => $row->error_code ?: 'AI_PROCESSING_FAILED',
        };
        $checkedAt = \Illuminate\Support\Carbon::parse($row->updated_at);
        $result = $this->result($feature, $row->model, $code, $checkedAt->toIso8601String());
        $cache = $this->cacheKey($feature, $row->model);
        $previous = Cache::get($cache);
        if ($checkedAt->copy()->addMinutes(10)->isFuture() && (! isset($previous['checked_at']) || $checkedAt->gte(\Illuminate\Support\Carbon::parse($previous['checked_at'])))) {
            Cache::put($cache, $result, $checkedAt->copy()->addMinutes(10));
        }
        return $result;
    }

    private function testFeed(string $model, int $actorId): array
    {
        if (! config('pm-ai.enabled') || ! config('pm-ai.post_check_enabled')) return $this->record('feed-moderation', $model, 'FEATURE_DISABLED');
        $slot = 'post_check_api_key';
        // Resolve the exact selected primary; never report a backup's success as primary health.
        $account = app(AiFeatureRouting::class)->primaryAccounting('feed_moderation', $slot);
        if (! $account) return $this->record('feed-moderation', $model, 'PROVIDER_NOT_CONFIGURED');
        $credentials = app(AiWorkspaceCredentials::class);
        $access = app(AiAdminAccess::class);
        $code = $account['ref'] === 'credential:env:'.$slot
            ? $credentials->testEnvironment($slot, $actorId, $access)
            : $credentials->test((int) substr($account['ref'], strlen('credential:')), $actorId, $access);
        return $this->record('feed-moderation', $model, $code === 'OPERATION_VERIFIED' ? null : $code);
    }
}
