<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Domain\AI\Support\ProviderHttpFailure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Tests the supplied secret, never an active or fallback key substituted by the runtime. */
final class AiCredentialDiagnostic
{
    private const OUTPUT_LIMIT = 512;

    public function __construct(private readonly AiDirectUsage $usage) {}

    /** A credential-level capability test is not a complete feature or moderation-policy test. */
    public function run(string $slot, #[\SensitiveParameter] string $secret, array $account): string
    {
        $lock = Cache::lock('pm:ai-credential-diagnostic:'.hash('sha256', $account['ref']), 90);
        if (! $lock->get()) return 'TEST_PENDING';
        try {
            if ($slot === 'post_check_api_key' && config('pm-ai.post_check_provider') === 'omni') {
                return $this->omni($secret);
            }
            if ($slot === 'post_check_api_key' && config('pm-ai.post_check_external_moderation')) {
                $moderation = $this->omni($secret);
                if ($moderation !== 'OPERATION_VERIFIED') return $moderation;
            }
            [$feature, $model] = $this->target($slot, $account['ref']);
            $provider = AiRuntimeSettings::SLOTS[$slot]['provider'];
            if (! is_string($model) || ! in_array($model, app(AiRuntimeSettings::class)->allowedModels(), true)
                || ! $this->compatible($provider, $model)) return 'MODEL_NOT_CONFIGURED';
            $price = AiFeatureRouting::price($model);
            if (! $price) return 'MODEL_PRICE_MISSING';
            // No retry of a test whose financial outcome is unresolved.
            if (DB::table('ai_requests')->where('subject_type', 'workspace_credential_test')
                ->where('credential_ref', $account['ref'])->whereIn('status', ['running', 'provider_status_unknown'])->exists()) {
                return 'PROVIDER_STATUS_UNKNOWN';
            }
            $estimate = max(0.000001, ceil((1000 * (float) $price['input'] + self::OUTPUT_LIMIT * (float) $price['output']) * 1.2 * 1000) / 1000000000);
            try {
                $id = $this->usage->begin($feature, $model, $price, $estimate, $account, provider: $provider, subjectType: 'workspace_credential_test');
            } catch (AiFailure $failure) {
                return $failure->safeCode;
            }
            try {
                $response = $this->generate($provider, $model, $secret);
                if (! $response->successful()) {
                    if ($response->status() >= 500 || $response->status() === 408 || $response->status() < 400) {
                        $this->usage->unknown($id);
                        return 'PROVIDER_STATUS_UNKNOWN';
                    }
                    $code = $this->httpCode($response);
                    $this->usage->reject($id, $code);
                    return $code;
                }
                $data = $response->json();
                [$input, $output, $cached, $valid] = $this->result($provider, is_array($data) ? $data : []);
                // A successful text diagnostic must report positive input and output usage.
                $valid = $valid && is_numeric($input) && is_numeric($output) && $input > 0 && $output > 0;
                // Charge actual usage even if the result cannot be validated.
                $this->usage->settle($id, $input, $output, $cached, $valid ? null : 'INVALID_RESPONSE');
                return $valid ? 'OPERATION_VERIFIED' : 'INVALID_RESPONSE';
            } catch (Throwable) {
                $this->usage->unknown($id);
                return 'PROVIDER_STATUS_UNKNOWN';
            }
        } finally {
            $lock->release();
        }
    }

    private function target(string $slot, string $ref): array
    {
        return match ($slot) {
            'daily_challenge_api_key' => ['scenario_generate', 'gpt-5-nano'],
            'post_check_api_key' => ['feed_moderation', PostContentCheckService::selectedModel()],
            'resume_extract_api_key' => ['resume_extract', app(ResumeExtractionSettings::class)->model()],
            'gemini_api_key' => ['trend_draft', config('pm-ai.gemini_trend_model')],
            'anthropic_api_key' => ['pmp_explain', DB::table('ai_workspace_models')->where('enabled', true)->where('capability', 'Text generation')->where('code', 'like', 'claude-%')->orderBy('code')->value('code')],
            'api_key' => $this->openAiTarget($ref),
        };
    }

    private function openAiTarget(string $ref): array
    {
        $codes = array_values(array_diff(array_keys(AiFeatureCatalog::FEATURES), ['scenario_generate', 'daily_challenge_review']));
        $rows = DB::table('ai_features')->whereIn('code', $codes)->orderByDesc('enabled')->orderBy('code')->get(['code', 'model', 'enabled']);
        // Prefer the existing PMP explanation model, when enabled. Otherwise choose a configured operation.
        $eligible = $rows->filter(fn ($row) => $this->compatible('openai', $row->model));
        $assigned = [];
        if (preg_match('/^credential:([0-9]+)$/D', $ref, $match)) {
            $assigned = DB::table('ai_workspace_feature_routes')->where('primary_credential_id', (int) $match[1])->pluck('feature_code')->all();
        }
        $row = $eligible->first(fn ($row) => $row->enabled && in_array($row->code, $assigned, true))
            ?? $eligible->first(fn ($row) => $row->enabled && $row->code === 'pmp_explain') ?? $eligible->first();
        return [$row?->code ?? 'pmp_explain', $row?->model];
    }

    private function compatible(string $provider, ?string $model): bool
    {
        return is_string($model) && match ($provider) {
            'openai' => (bool) preg_match('/^(?:gpt-|o[1-9])[A-Za-z0-9.-]+$/D', $model),
            'gemini' => (bool) preg_match('/^gemini-[A-Za-z0-9.-]+$/D', $model),
            'anthropic' => (bool) preg_match('/^claude-[A-Za-z0-9.-]+$/D', $model),
            default => false,
        };
    }

    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::acceptJson()->withoutRedirecting()->connectTimeout(4)->timeout(25);
    }

    private function omni(#[\SensitiveParameter] string $secret): string
    {
        try {
            $response = $this->client()->withToken($secret)->post('https://api.openai.com/v1/moderations', [
                'model' => OmniPostModerationService::MODEL, 'input' => 'A project team reviewed its delivery schedule.',
            ]);
            if (! $response->successful()) return $this->httpCode($response);
            $flag = $response->json('results.0.flagged');
            $categories = $response->json('results.0.categories');
            return is_bool($flag) && is_array($categories) && $categories !== []
                && collect($categories)->every(fn ($value) => is_bool($value)) && $flag === in_array(true, $categories, true)
                ? 'OPERATION_VERIFIED' : 'INVALID_RESPONSE';
        } catch (ConnectionException) {
            return 'CONNECTION_UNAVAILABLE';
        }
    }

    private function httpCode(\Illuminate\Http\Client\Response $response): string
    {
        $error = $response->json('error.code');
        if (! is_string($error)) $error = collect($response->json('error.details', []))->pluck('reason')->first(fn ($item) => is_string($item));
        return ProviderHttpFailure::code($response->status(), is_string($error) ? $error : null);
    }

    private function generate(string $provider, string $model, #[\SensitiveParameter] string $secret): \Illuminate\Http\Client\Response
    {
        // Fixed synthetic input; no documents, prompts, tools with side effects or member credits.
        $text = 'Return the word OK.';
        $client = $this->client();
        if ($provider === 'gemini') {
            return $client->withHeaders(['x-goog-api-key' => $secret])->post('https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent', [
                'contents' => [['role' => 'user', 'parts' => [['text' => $text]]]],
                'generationConfig' => ['maxOutputTokens' => self::OUTPUT_LIMIT],
            ]);
        }
        if ($provider === 'anthropic') {
            return $client->withHeaders(['x-api-key' => $secret, 'anthropic-version' => '2023-06-01'])->post('https://api.anthropic.com/v1/messages', [
                'model' => $model, 'max_tokens' => self::OUTPUT_LIMIT, 'messages' => [['role' => 'user', 'content' => $text]],
            ]);
        }
        $body = ['model' => $model, 'input' => $text, 'max_output_tokens' => self::OUTPUT_LIMIT, 'store' => false];
        if (str_starts_with($model, 'gpt-5-nano')) $body['reasoning'] = ['effort' => 'minimal'];
        return $client->withToken($secret)->post('https://api.openai.com/v1/responses', $body);
    }

    private function result(string $provider, array $data): array
    {
        if ($provider === 'gemini') {
            $usage = $data['usageMetadata'] ?? [];
            // Gemini output billing includes thinking tokens.
            $output = isset($usage['candidatesTokenCount']) || isset($usage['thoughtsTokenCount'])
                ? ($usage['candidatesTokenCount'] ?? 0) + ($usage['thoughtsTokenCount'] ?? 0) : null;
            return [$usage['promptTokenCount'] ?? null, $output, $usage['cachedContentTokenCount'] ?? 0,
                data_get($data, 'candidates.0.finishReason') === 'STOP' && collect(data_get($data, 'candidates.0.content.parts', []))->contains(fn ($part) => ! ($part['thought'] ?? false) && filled($part['text'] ?? null))];
        }
        if ($provider === 'anthropic') {
            $usage = $data['usage'] ?? [];
            // No prompt caching was requested; unexpected extra billing dimensions are unknown.
            if (($usage['cache_creation_input_tokens'] ?? 0) > 0 || ($usage['cache_read_input_tokens'] ?? 0) > 0) return [null, null, 0, false];
            return [$usage['input_tokens'] ?? null, $usage['output_tokens'] ?? null, 0,
                ($data['stop_reason'] ?? null) === 'end_turn' && collect($data['content'] ?? [])->contains(fn ($part) => ($part['type'] ?? '') === 'text' && filled($part['text'] ?? null))];
        }
        $valid = ($data['status'] ?? null) === 'completed' && collect($data['output'] ?? [])->flatMap(fn ($part) => $part['content'] ?? [])->contains(fn ($part) => ($part['type'] ?? '') === 'output_text' && filled($part['text'] ?? null));
        return [data_get($data, 'usage.input_tokens'), data_get($data, 'usage.output_tokens'), data_get($data, 'usage.input_tokens_details.cached_tokens', 0), $valid];
    }

    public static function message(string $code): string
    {
        return match ($code) {
            'OPERATION_VERIFIED' => 'Credential operation verified successfully.',
            'PROVIDER_AUTH_FAILED' => 'API authentication failed. Check whether this key is valid and has not been revoked.',
            'PROVIDER_PERMISSION_DENIED' => 'The provider denied access to the intended operation. Check project and endpoint permissions.',
            'PROVIDER_MODEL_NOT_FOUND' => 'The configured model is not available to this credential.',
            'MODEL_NOT_CONFIGURED' => 'Configure an approved generation model for this routing target first.',
            'MODEL_PRICE_MISSING' => 'Approve the model price in AI Models before running a paid diagnostic.',
            'BUDGET_NOT_CONFIGURED', 'DAILY_AI_BUDGET_REACHED', 'MONTHLY_AI_BUDGET_REACHED', 'FEATURE_AI_BUDGET_REACHED' => 'The required AI spending limit is unavailable or exhausted. No paid request was sent.',
            'PROVIDER_QUOTA_EXHAUSTED' => 'Provider billing quota is exhausted.',
            'PROVIDER_RATE_LIMITED' => 'Provider rate limit reached. Retry later.',
            'PROVIDER_STATUS_UNKNOWN' => 'The provider outcome is uncertain. Reconcile the recorded request before retrying.',
            'TEST_PENDING' => 'A credential diagnostic is already running.',
            'INVALID_RESPONSE' => 'The provider returned an incomplete or invalid diagnostic result.',
            'CONNECTION_UNAVAILABLE', 'PROVIDER_UNAVAILABLE' => 'The provider could not be reached.',
            default => 'The provider rejected the diagnostic request ('.$code.').',
        };
    }
}
