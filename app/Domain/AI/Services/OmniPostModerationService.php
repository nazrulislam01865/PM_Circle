<?php

namespace App\Domain\AI\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Converts an Omni moderation signal into the existing private check/review workflow. */
final class OmniPostModerationService
{
    public const MODEL = 'omni-moderation-latest';

    /**
     * Omni does not assess commercial spam, scams, or context-dependent harassment.
     * Unsupported safety categories go to manual review, never to automatic strikes.
     *
     * @param array<string, mixed> $context
     * @return array{violates:bool,needs_review:bool,category:string,target:string,reason:string,input_tokens:int,output_tokens:int}
     */
    public function inspect(string $body, ?string $imageBytes, ?string $mime, string $key, array $context = []): array
    {
        $input = [];
        if (trim($body) !== '') {
            $input[] = ['type' => 'text', 'text' => mb_substr($body, 0, 5500)];
        }
        if ($imageBytes !== null) {
            $input[] = ['type' => 'image_url',
                'image_url' => ['url' => 'data:'.$mime.';base64,'.base64_encode($imageBytes)]];
        }
        if ($input === []) {
            throw new RuntimeException('POST_CHECK_INVALID_INPUT');
        }

        try {
            $response = Http::withToken($key)->acceptJson()
                ->timeout((int) config('pm-ai.timeout_seconds', 25))
                ->post(rtrim((string) config('pm-ai.endpoint'), '/').'/moderations', [
                    'model' => self::MODEL,
                    'input' => $input,
                ]);
        } catch (ConnectionException $exception) {
            throw new RuntimeException('POST_CHECK_PROVIDER_UNAVAILABLE', previous: $exception);
        }
        if (! $response->successful()) {
            throw new RuntimeException(match ($response->status()) {
                401, 403 => 'POST_CHECK_KEY_DENIED',
                429 => 'POST_CHECK_RATE_LIMITED',
                default => 'POST_CHECK_PROVIDER_UNAVAILABLE',
            });
        }

        $item = $response->json('results.0');
        if (! is_array($item) || ! is_bool($item['flagged'] ?? null)
            || ! is_array($item['categories'] ?? null) || $item['categories'] === []) {
            throw new RuntimeException('POST_CHECK_INVALID_RESULT');
        }
        $categories = $item['categories'];
        foreach ($categories as $name => $flag) {
            if (! is_string($name) || ! is_bool($flag)) {
                throw new RuntimeException('POST_CHECK_INVALID_RESULT');
            }
        }
        $active = array_keys(array_filter($categories, static fn (bool $flag): bool => $flag));
        if ((bool) $item['flagged'] !== ($active !== [])) {
            throw new RuntimeException('POST_CHECK_INVALID_RESULT');
        }
        if ($active === []) {
            return [
                'violates' => false, 'needs_review' => false,
                'category' => 'none', 'target' => 'none', 'reason' => '',
                'input_tokens' => 0, 'output_tokens' => 0,
            ];
        }

        $category = 'other';
        foreach (['hate' => ['hate', 'hate/threatening'],
            'violence' => ['violence', 'violence/graphic'],
            'sexual' => ['sexual', 'sexual/minors'],
            'harassment' => ['harassment', 'harassment/threatening']] as $kind => $keys) {
            if (array_intersect($keys, $active) !== []) {
                $category = $kind;
                break;
            }
        }

        $modalities = [];
        $applied = $item['category_applied_input_types'] ?? null;
        if (is_array($applied)) {
            foreach ($active as $name) {
                if (! array_key_exists($name, $applied) || ! is_array($applied[$name])) {
                    continue;
                }
                foreach ($applied[$name] as $type) {
                    if ($type === 'text' || $type === 'image') {
                        $modalities[$type] = true;
                    }
                }
            }
        }
        // When both inputs were sent and the API cannot attribute the flag,
        // human review is safer than assigning a strike to an unknown input.
        $ambiguousTarget = $modalities === [] && $imageBytes !== null && trim($body) !== '';
        $target = match (true) {
            isset($modalities['text'], $modalities['image']) => 'both',
            isset($modalities['image']) => 'image',
            isset($modalities['text']) => 'text',
            $imageBytes !== null && trim($body) === '' => 'image',
            $imageBytes !== null => 'both',
            default => 'text',
        };
        // A contextual reply should be reviewed rather than automatically punished
        // for quoting an existing post or a previously approved parent comment.
        $contextual = trim((string) ($context['post_excerpt'] ?? '')) !== ''
            || trim((string) ($context['parent_comment'] ?? '')) !== '';
        $needsReview = $category === 'other' || $ambiguousTarget || $contextual;
        $reason = match ($category) {
            'hate' => 'This content was flagged for hateful or discriminatory language.',
            'violence' => 'This content was flagged for violent or graphic material.',
            'sexual' => 'This content was flagged for sexual content.',
            'harassment' => 'This content was flagged for harassment or threats.',
            default => 'This content needs an additional safety review.',
        };
        return [
            'violates' => ! $needsReview, 'needs_review' => $needsReview,
            'category' => $category, 'target' => $target,
            'reason' => $reason,
            'input_tokens' => 0, 'output_tokens' => 0,
        ];
    }
}
