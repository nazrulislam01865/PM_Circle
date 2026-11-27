<?php

namespace App\Domain\AI\Providers;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Support\AiFailure;
use App\Domain\AI\Support\ProviderHttpFailure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/** Optional editorial-only adapter. Other AI features keep their current provider. */
final class GeminiTrendProvider implements AiProvider
{
    public function generate(string $model, string $instructions, array $context,
        array $schema, int $maxOutputTokens, bool $useExternalModeration = true): array
    {
        if (($context['_ai_feature_code'] ?? null) !== 'trend_draft') {
            throw new AiFailure('FEATURE_UNAVAILABLE', 503);
        }
        unset($context['_ai_feature_code']);
        $key = app(\App\Domain\AI\Services\AiRuntimeSettings::class)->credential('gemini_api_key');
        if (! is_string($key) || trim($key) === '') {
            throw new AiFailure('PROVIDER_NOT_CONFIGURED', 503, retrySafe: true);
        }
        if (! preg_match('/^gemini-[a-zA-Z0-9.-]{1,70}$/D', $model)) {
            throw new AiFailure('MODEL_NOT_ALLOWLISTED', 503);
        }
        $message = json_encode($context, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        // Mandatory independent moderation for editorial input and output, even when generation uses Gemini.
        $this->moderate($message);
        try {
            $response = Http::withHeaders(['x-goog-api-key' => $key])->acceptJson()
                ->connectTimeout(5)->timeout((int) config('pm-ai.timeout_seconds'))
                ->post('https://generativelanguage.googleapis.com/v1beta/models/'.rawurlencode($model).':generateContent', [
                    'systemInstruction' => ['parts' => [['text' => $instructions]]],
                    'contents' => [['role' => 'user', 'parts' => [['text' => $message]]]],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json', 'responseJsonSchema' => $schema,
                        'maxOutputTokens' => $maxOutputTokens,
                    ],
                ]);
        } catch (ConnectionException) {
            throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
        }
        if (! $response->successful()) {
            if ($response->status() >= 500 || $response->status() === 408) throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
            $reason = collect($response->json('error.details', []))->pluck('reason')->first(fn ($item) => is_string($item));
            throw new AiFailure(ProviderHttpFailure::code($response->status(), $reason), 503, retrySafe: in_array($response->status(), [401, 402, 403, 404, 429], true));
        }
        $data = $response->json();
        $answer = collect(data_get($data, 'candidates.0.content.parts', []))
            ->reject(fn ($part) => ! is_array($part) || ($part['thought'] ?? false))
            ->pluck('text')->filter(fn ($text) => is_string($text))->implode('');
        $decoded = json_decode($answer, true);
        $in = data_get($data, 'usageMetadata.promptTokenCount');
        $out = data_get($data, 'usageMetadata.candidatesTokenCount');
        $thoughts = data_get($data, 'usageMetadata.thoughtsTokenCount', 0);
        $cached = data_get($data, 'usageMetadata.cachedContentTokenCount', 0);
        if (! is_int($in) || ! is_int($out) || ! is_int($thoughts) || ! is_int($cached) || $in < 0 || $out < 0 || $thoughts < 0 || $cached < 0 || $cached > $in) throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
        $metered = ['input_tokens' => $in, 'cached_tokens' => $cached, 'output_tokens' => $out + $thoughts];
        if (data_get($data, 'candidates.0.finishReason') !== 'STOP') throw new AiFailure('INCOMPLETE_AI_RESPONSE', 503, usage: $metered);
        if (! is_array($decoded) || $in < 1 || $out < 1) throw new AiFailure('INVALID_AI_RESPONSE', 503, usage: $metered);
        try { $this->moderate($answer); } catch (AiFailure $e) { throw new AiFailure($e->safeCode, $e->httpStatus, usage: $metered); }

        return ['id' => (string) ($data['responseId'] ?? ''), 'model' => (string) ($data['modelVersion'] ?? $model),
            'result' => $decoded, 'input_tokens' => $in, 'cached_tokens' => $cached, 'output_tokens' => $out + $thoughts];
    }

    private function moderate(string $text): void
    {
        $key = app(\App\Domain\AI\Services\AiFeatureRouting::class)->moderationSecret(allowLegacyDefault: true);
        if (! is_string($key) || trim($key) === '') {
            throw new AiFailure('MODERATION_UNAVAILABLE', 503);
        }
        try {
            $response = Http::withToken($key)->acceptJson()->connectTimeout(5)
                ->timeout(8)
                ->post(config('pm-ai.endpoint').'/moderations', ['model' => 'omni-moderation-latest', 'input' => $text]);
        } catch (ConnectionException) {
            throw new AiFailure('MODERATION_UNAVAILABLE', 503);
        }
        if (! $response->successful()) {
            $code = $response->json('error.code');
            throw new AiFailure(ProviderHttpFailure::moderationCode($response->status(), is_string($code) ? $code : null), 503);
        }
        if (! is_bool($response->json('results.0.flagged'))) {
            throw new AiFailure('MODERATION_UNAVAILABLE', 503);
        }
        if ($response->json('results.0.flagged')) {
            throw new AiFailure('CONTENT_REJECTED', 422);
        }
    }
}
