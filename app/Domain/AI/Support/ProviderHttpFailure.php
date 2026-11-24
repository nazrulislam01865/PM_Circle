<?php

namespace App\Domain\AI\Support;

/** Never send raw upstream error bodies or credentials to the browser. */
final class ProviderHttpFailure
{
    public static function code(int $status, ?string $errorCode = null): string
    {
        if ($errorCode === 'API_KEY_INVALID' || $errorCode === 'invalid_api_key') {
            return 'PROVIDER_AUTH_FAILED';
        }
        if ($errorCode === 'missing_scope' || $errorCode === 'API_KEY_SERVICE_BLOCKED') {
            return 'PROVIDER_PERMISSION_DENIED';
        }
        if (in_array($errorCode, ['insufficient_quota', 'billing_hard_limit_reached'], true) || $status === 402) {
            return 'PROVIDER_QUOTA_EXHAUSTED';
        }

        return match ($status) {
            400, 422 => 'PROVIDER_INVALID_REQUEST',
            401 => 'PROVIDER_AUTH_FAILED',
            403 => 'PROVIDER_PERMISSION_DENIED',
            404 => 'PROVIDER_MODEL_NOT_FOUND',
            429 => 'PROVIDER_RATE_LIMITED',
            default => $status >= 500 || $status === 408 ? 'PROVIDER_UNAVAILABLE' : 'PROVIDER_REJECTED',
        };
    }

    public static function moderationCode(int $status, ?string $errorCode = null): string
    {
        if ($errorCode === 'missing_scope' || $status === 403) return 'MODERATION_PERMISSION_DENIED';
        return match ($status) {
            401 => 'MODERATION_AUTH_FAILED',
            429 => 'MODERATION_RATE_LIMITED',
            default => 'MODERATION_UNAVAILABLE',
        };
    }
}
