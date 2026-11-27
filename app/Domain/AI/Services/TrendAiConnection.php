<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Domain\AI\Jobs\ExecuteAiRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Career Trends provider registry and budgeted connection diagnostics. */
final class TrendAiConnection
{
    public const PROVIDERS = ['openai' => 'OpenAI', 'gemini' => 'Google Gemini'];

    public function model(string $provider, ?string $featureModel): ?string
    {
        return match ($provider) {
            'openai' => $featureModel,
            'gemini' => config('pm-ai.gemini_trend_model'),
            default => null,
        };
    }

    private function key(string $provider): ?string
    {
        return match ($provider) {
            'openai' => app(AiFeatureRouting::class)->primarySecret('trend_draft', 'api_key'),
            'gemini' => app(AiFeatureRouting::class)->primarySecret('trend_draft', 'gemini_api_key'),
            default => null,
        };
    }

    private function moderationKey(string $provider): ?string
    {
        return $provider === 'gemini' ? (app(\App\Domain\AI\Services\AiFeatureRouting::class)->moderationSecret(allowLegacyDefault: true)) : $this->key('openai');
    }

    public function configurationIssue(string $provider, ?string $model): ?string
    {
        if (! filled($this->key($provider))) return 'PROVIDER_NOT_CONFIGURED';
        if (! $model || ! in_array($model, app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), true)
            || ($provider === 'gemini' && ! preg_match('/^gemini-[a-zA-Z0-9.-]{1,70}$/D', $model))
            || ($provider === 'openai' && str_starts_with($model, 'gemini-'))) return 'MODEL_NOT_ALLOWLISTED';
        if (! filled($this->moderationKey($provider))) return 'MODERATION_UNAVAILABLE';

        return null;
    }

    public function assertConfigured(string $provider, ?string $model): void
    {
        if ($issue = $this->configurationIssue($provider, $model)) {
            throw new AiFailure($issue, 503);
        }
    }

    private function cacheKey(string $provider, ?string $model): string
    {
        return 'pm:trend-ai:'.$this->fingerprint($provider, $model);
    }

    private function fingerprint(string $provider, ?string $model): string
    {
        return hash_hmac('sha256', json_encode([$provider, $model, $this->key($provider), $this->moderationKey($provider), app(AiFeatureRouting::class)->primaryAccounting('trend_draft', AiFeatureRouting::slot('trend_draft', $provider))]), (string) config('app.key'));
    }

    public function assertCurrent(object $request): void
    {
        $model = $this->model($request->provider, DB::table('ai_features')->where('code', 'trend_draft')->value('model'));
        if ($model !== $request->model || $request->client_key !== $this->fingerprint($request->provider, $model)) {
            throw new AiFailure('CONFIGURATION_CHANGED', 409);
        }
    }

    public function recordCompleted(object $request, ?string $issue): void
    {
        if ($request->subject_type === 'trend_connection_test') {
            try { $this->assertCurrent($request); } catch (AiFailure) { return; }
        } else {
            // A production fallback is not verification of the primary credential.
            $actual = DB::table('ai_requests')->where('id', $request->id)->value('credential_ref');
            $primary = app(AiFeatureRouting::class)->primaryAccounting('trend_draft', AiFeatureRouting::slot('trend_draft', $request->provider));
            if (! $actual || $actual !== ($primary['ref'] ?? null)) return;
        }
        $this->record($request->provider, $request->model, $issue);
    }

    public function status(string $provider, ?string $model, bool $featureEnabled = true): array
    {
        $issue = $this->configurationIssue($provider, $model);
        if ($issue) return $this->result($provider, $model, $issue, null);
        if (! $featureEnabled || ! config('pm-ai.enabled') || ! config('pm-ai.editorial_enabled')) return $this->result($provider, $model, 'FEATURE_DISABLED', null);
        $cached = Cache::get($this->cacheKey($provider, $model));

        return is_array($cached) ? [...$cached, ...$this->credentialHealth($provider)] : $this->result($provider, $model, 'NOT_TESTED', null);
    }

    /** Test the same generation + moderation path as a real report, without creating a draft. */
    public function queueTest(string $provider, ?string $model, int $actorId): array
    {
        $issue = $this->configurationIssue($provider, $model);
        if ($issue) return $this->record($provider, $model, $issue);
        if (! config('pm-ai.enabled') || ! config('pm-ai.editorial_enabled')) {
            return $this->record($provider, $model, 'FEATURE_DISABLED');
        }
        $feature = DB::table('ai_features')->where('code', 'trend_draft')->first();
        if (! $feature || ! $feature->enabled) return $this->record($provider, $model, 'FEATURE_DISABLED');
        $price = DB::table('ai_model_prices')->where('model', $model)
            ->where('effective_from', '<=', now())->orderByDesc('effective_from')->first();
        if (! $price) return $this->record($provider, $model, 'MODEL_PRICE_MISSING');
        $prices = ['input' => $price->input_usd_per_m, 'cached' => $price->cached_input_usd_per_m, 'output' => $price->output_usd_per_m];
        try {
            return DB::transaction(function () use ($provider, $model, $actorId, $feature, $price, $prices): array {
                // Serialize test admission with the settings record, and reuse in-flight tests.
                DB::table('career_trend_settings')->where('id', 1)->lockForUpdate()->first();
                $existing = DB::table('ai_requests')->where('subject_type', 'trend_connection_test')
                    ->where('subject_id', $actorId)->where('provider', $provider)->where('model', $model)->where('client_key', $this->fingerprint($provider, $model))
                    ->whereIn('status', ['queued', 'running'])->where('lease_until', '>', now())->latest('id')->first();
                if ($existing) return $this->pending($provider, $model, $existing->request_uuid);
                $uuid = (string) Str::uuid();
                $context = ['context' => ['diagnostic' => true, 'sample' => 'A project team reviewed a schedule.'], 'message' => null];
                $instructions = 'This is an internal connection diagnostic, not a report for publication. Return the required JSON fields: title, summary and body_markdown must each contain the single word Test; source_urls must be an empty array. No external facts.';
                $id = DB::table('ai_requests')->insertGetId([
                    'request_uuid' => $uuid, 'feature_code' => 'trend_draft', 'subject_type' => 'trend_connection_test',
                    'subject_id' => $actorId, 'client_key' => $this->fingerprint($provider, $model), 'status' => 'queued', 'model' => $model, 'provider' => $provider,
                    'prompt_version' => $feature->prompt_version, 'max_output_tokens' => 1024,
                    'payload_encrypted' => Crypt::encryptString(json_encode(['context' => $context, 'instructions' => $instructions], JSON_THROW_ON_ERROR)),
                    'model_price_snapshot' => json_encode([...$prices, 'price_id' => $price->id], JSON_THROW_ON_ERROR),
                    'lease_until' => now()->addSeconds((int) config('pm-ai.lease_seconds')),
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                app(AiBudgetService::class)->reserve($id, 'trend_draft', $context, $prices, 1024);
                DB::afterCommit(fn () => ExecuteAiRequest::dispatch($id)->onQueue(config('pm-ai.editorial_queue')));
                return $this->pending($provider, $model, $uuid);
            }, 3);
        } catch (AiFailure $exception) {
            return $this->record($provider, $model, $exception->safeCode);
        }
    }

    public function testStatus(string $uuid, int $actorId): array
    {
        $row = DB::table('ai_requests')->where('request_uuid', $uuid)->where('subject_type', 'trend_connection_test')
            ->where('subject_id', $actorId)->first();
        abort_unless($row, 404);
        try { $this->assertCurrent($row); } catch (AiFailure) { return $this->result($row->provider, $row->model, 'CONFIGURATION_CHANGED', null); }
        if (in_array($row->status, ['queued', 'running'], true) && $row->lease_until && now()->lt(\Illuminate\Support\Carbon::parse($row->lease_until))) {
            return $this->pending($row->provider, $row->model, $uuid);
        }
        $issue = match ($row->status) {
            'completed' => null,
            'provider_status_unknown' => 'PROVIDER_STATUS_UNKNOWN',
            'queued', 'running' => 'TEST_TIMEOUT',
            default => $row->error_code ?: 'AI_PROCESSING_FAILED',
        };
        // Use the request's timestamp, not the polling time, so stale results never look fresh.
        return $this->result($row->provider, $row->model, $issue, \Illuminate\Support\Carbon::parse($row->updated_at)->toIso8601String());
    }

    private function pending(string $provider, ?string $model, string $uuid): array
    {
        return [...$this->result($provider, $model, 'TEST_PENDING', null), 'pending' => true, 'request_id' => $uuid];
    }

    public function record(string $provider, ?string $model, ?string $issue): array
    {
        $result = $this->result($provider, $model, $issue, now()->toIso8601String());
        Cache::put($this->cacheKey($provider, $model), $result, now()->addMinutes(10));
        return $result;
    }

    private function credentialHealth(string $provider): array
    {
        $slot = AiFeatureRouting::slot('trend_draft', $provider);
        return app(AiWorkspaceCredentials::class)->healthFor(app(AiFeatureRouting::class)->primaryAccounting('trend_draft', $slot), $slot);
    }

    private function result(string $provider, ?string $model, ?string $issue, ?string $checkedAt): array
    {
        $message = match ($issue) {
            null => 'Generation and mandatory moderation verified successfully.',
            'TEST_PENDING' => 'Testing generation and moderation. Waiting for the AI queue.',
            'CONFIGURATION_CHANGED' => 'The workspace connection changed. Test the current saved connection again.',
            'TEST_TIMEOUT' => 'Connection test timed out. Check the editorial queue worker.',
            'FEATURE_DISABLED' => 'Enable the AI gateway, editorial generation and Trend draft feature before testing.',
            'MODEL_PRICE_MISSING' => 'Publish an approved price for this model before running a test.',
            'BUDGET_NOT_CONFIGURED' => 'Configure the global and editorial AI budgets before testing.',
            'DAILY_AI_BUDGET_REACHED' => 'Daily AI budget reached. No diagnostic request was sent.',
            'AI_PROCESSING_FAILED' => 'AI processing failed. Check the editorial worker and server logs.',
            'QUEUE_JOB_FAILED' => 'The AI queue job failed. Check the editorial worker and server logs.',
            'NOT_TESTED' => 'Connection has not been checked recently. Select Test connection.',
            'PROVIDER_NOT_CONFIGURED' => 'No usable primary credential is assigned. Select a tested credential from AI Workspace.',
            'MODEL_NOT_ALLOWLISTED' => 'Configure an approved model in AI settings and the model allowlist.',
            'PROVIDER_AUTH_FAILED' => 'API authentication failed. Check the API key.',
            'PROVIDER_PERMISSION_DENIED' => 'API permission denied. Check key access to the selected model.',
            'PROVIDER_MODEL_NOT_FOUND', 'PROVIDER_MODEL_UNSUPPORTED' => 'The selected model is unavailable or does not support generation.',
            'PROVIDER_QUOTA_EXHAUSTED' => 'Provider quota or billing limit reached.',
            'PROVIDER_RATE_LIMITED' => 'Provider rate or quota limit reached. Try again later or switch provider.',
            'PROVIDER_INVALID_REQUEST' => 'Provider rejected the request. Check the model configuration.',
            'MODERATION_AUTH_FAILED' => 'Moderation API authentication failed.',
            'MODERATION_PERMISSION_DENIED' => 'Moderation key lacks required permissions.',
            'MODERATION_RATE_LIMITED' => 'Moderation API rate limit reached.',
            'MODERATION_UNAVAILABLE' => 'Required moderation is unavailable. Check the moderation key and its permissions.',
            'PROVIDER_UNAVAILABLE', 'PROVIDER_STATUS_UNKNOWN' => 'Provider did not respond successfully. Check network access or provider availability.',
            default => 'Provider returned an unsuccessful or invalid response ('.$issue.').',
        };
        return [...$this->credentialHealth($provider), 'provider' => $provider, 'model' => $model, 'routing_target' => $provider === 'gemini' ? 'gemini_api_key' : 'api_key', 'credential_name' => app(AiFeatureRouting::class)->primaryName('trend_draft', $provider === 'gemini' ? 'gemini_api_key' : 'api_key'), 'connected' => $issue === null, 'code' => $issue, 'message' => $message, 'checked_at' => $checkedAt, 'pending' => false];
    }
}
