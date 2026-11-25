<?php

namespace App\Domain\DailyChallenge\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/** Checks the shared Post Check Omni key without exposing private content; never sends member content or writes to the database. */
final class DailyChallengeModerationProbe
{
    /** @return array{ok: bool, http_status: int|null, request_id: string|null, code: string} */
    public function check(): array
    {
        $key = app(\App\Domain\AI\Services\AiRuntimeSettings::class)->credential('post_check_api_key');
        if (! is_string($key) || trim($key) === '') {
            return $this->result(false, null, null, 'POST_CHECK_OMNI_KEY_MISSING');
        }

        try {
            $response = Http::withToken($key)->acceptJson()->timeout(15)
                ->post(rtrim((string) config('pm-ai.endpoint'), '/').'/moderations', [
                    'model' => 'omni-moderation-latest',
                    'input' => 'A safe educational project management scenario.',
                ]);
        } catch (ConnectionException) {
            return $this->result(false, null, null, 'MODERATION_CONNECTION_FAILED');
        }

        $status = $response->status();
        $requestId = $response->header('x-request-id');
        $requestId = is_string($requestId) && preg_match('/^req_[A-Za-z0-9_-]{4,120}$/', $requestId)
            ? $requestId : null;

        if (! $response->successful()) {
            return $this->result(false, $status, $requestId, 'MODERATION_HTTP_'.$status);
        }

        $flagged = $response->json('results.0.flagged');
        if (! is_bool($flagged)) {
            return $this->result(false, $status, $requestId, 'MODERATION_RESPONSE_INVALID');
        }

        if ($flagged) {
            return $this->result(false, $status, $requestId, 'MODERATION_PROBE_FLAGGED');
        }

        return $this->result(true, $status, $requestId, 'MODERATION_AVAILABLE');
    }

    /** @return array{ok: bool, http_status: int|null, request_id: string|null, code: string} */
    private function result(bool $ok, ?int $status, ?string $requestId, string $code): array
    {
        return ['ok' => $ok, 'http_status' => $status, 'request_id' => $requestId, 'code' => $code];
    }
}
