<?php

namespace App\Domain\AI\Providers;

use App\Domain\AI\Contracts\AiProvider;
use App\Domain\AI\Services\AiRuntimeSettings;
use App\Domain\AI\Support\AiFailure;
use App\Domain\AI\Support\ProviderHttpFailure;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/** Approved Claude backup: structured tool result, no tool execution or autonomous actions. */
final class AnthropicMessagesProvider implements AiProvider
{
    public function generate(string $model, string $instructions, array $context, array $schema, int $maxOutputTokens, bool $useExternalModeration = true): array
    {
        $feature = $context['_ai_feature_code'] ?? null;
        if (! in_array($feature, ['pmp_explain','pmp_followup','scenario_review','scenario_comment_review','ask_ai','trend_draft'], true) || ! preg_match('/^claude-[A-Za-z0-9.-]{1,70}$/D', $model)) throw new AiFailure('FEATURE_UNAVAILABLE', 503);
        unset($context['_ai_feature_code'], $context['_connection_diagnostic']);
        $runtime = app(AiRuntimeSettings::class);
        $key = $runtime->credential('anthropic_api_key');
        if (! $key) throw new AiFailure('PROVIDER_NOT_CONFIGURED', 503, retrySafe: true);
        $message = json_encode($context, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        // Independent input/output moderation is mandatory for the backup adapter.
        $this->moderate($message);
        try {
            $response = Http::withHeaders(['x-api-key' => $key, 'anthropic-version' => '2023-06-01'])->acceptJson()->withoutRedirecting()->connectTimeout(5)->timeout((int) config('pm-ai.timeout_seconds', 25))->post('https://api.anthropic.com/v1/messages', [
                'model' => $model, 'max_tokens' => $maxOutputTokens, 'system' => $instructions,
                'messages' => [['role' => 'user', 'content' => $message]],
                'tools' => [['name' => 'pm_circle_structured_answer', 'description' => 'Return the requested answer as structured data only.', 'input_schema' => $schema]],
                'tool_choice' => ['type' => 'tool', 'name' => 'pm_circle_structured_answer'],
            ]);
        } catch (ConnectionException) { throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503); }
        if (! $response->successful()) {
            if ($response->status() >= 500 || $response->status() === 408) throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
            throw new AiFailure(ProviderHttpFailure::code($response->status()), 503, retrySafe: in_array($response->status(), [401,402,403,404,429], true));
        }
        $data = $response->json();
        $tool = collect($data['content'] ?? [])->filter(fn ($part) => ($part['type'] ?? null) === 'tool_use' && ($part['name'] ?? null) === 'pm_circle_structured_answer');
        $result = $tool->count() === 1 ? $tool->first()['input'] ?? null : null;
        $in = data_get($data, 'usage.input_tokens'); $out = data_get($data, 'usage.output_tokens');
        // No prompt caching is requested. Reject unexpected billing dimensions rather than guessing costs.
        if (! is_int($in) || ! is_int($out) || $in < 0 || $out < 0 || data_get($data, 'usage.cache_creation_input_tokens', 0) > 0 || data_get($data, 'usage.cache_read_input_tokens', 0) > 0) throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
        $metered = ['input_tokens' => $in, 'cached_tokens' => 0, 'output_tokens' => $out];
        if (($data['stop_reason'] ?? null) !== 'tool_use' || ! is_array($result) || $in < 1 || $out < 1) throw new AiFailure('INVALID_AI_RESPONSE', 503, usage: $metered);
        try { $this->moderate(json_encode($result, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)); } catch (AiFailure $e) { throw new AiFailure($e->safeCode, $e->httpStatus, usage: $metered); }
        return ['id' => (string) ($data['id'] ?? ''), 'model' => (string) ($data['model'] ?? $model), 'result' => $result, 'input_tokens' => $in, 'cached_tokens' => 0, 'output_tokens' => $out];
    }

    private function moderate(string $text): void
    {
        $runtime = app(AiRuntimeSettings::class);
        $key = $runtime->credential('post_check_api_key') ?: $runtime->credential('api_key');
        if (! $key) throw new AiFailure('MODERATION_UNAVAILABLE', 503);
        try { $response = Http::withToken($key)->acceptJson()->withoutRedirecting()->connectTimeout(4)->timeout(8)->post(config('pm-ai.endpoint').'/moderations', ['model' => 'omni-moderation-latest', 'input' => $text]); }
        catch (ConnectionException) { throw new AiFailure('MODERATION_UNAVAILABLE', 503); }
        if (! $response->successful() || ! is_bool($response->json('results.0.flagged'))) throw new AiFailure('MODERATION_UNAVAILABLE', 503);
        if ($response->json('results.0.flagged')) throw new AiFailure('CONTENT_REJECTED', 422);
    }
}
