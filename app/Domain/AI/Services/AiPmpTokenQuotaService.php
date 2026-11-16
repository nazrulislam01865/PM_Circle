<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Separate actual OpenAI tokens from PM Circle credits and reply counts. */
final class AiPmpTokenQuotaService
{
    /** Reuse the policy and cycle already calculated by the chat quota reservation. */
    public function reserve(User $user, int $requestId, string $feature, array $context, int $maxOutput,
        array $tokenPolicy): void
    {
        if (! in_array($feature, ['pmp_explain', 'pmp_followup'], true)) {
            return;
        }
        $allocated = (int) ($tokenPolicy['allocated'] ?? 0);
        if ($allocated < 1) {
            throw new AiFailure('TOKEN_ALLOCATION_NOT_CONFIGURED', 503);
        }
        $start = $tokenPolicy['cycle_start'] ?? null;
        $bucket = DB::table('ai_chat_usage_buckets')->where('user_id', $user->id)
            ->where('scope_key', 'feature:pmp')->where('window_kind', 'cycle')
            ->where('window_start_utc', $start)->lockForUpdate()->first();
        if (! $bucket) {
            throw new AiFailure('TOKEN_ALLOCATION_NOT_CONFIGURED', 503);
        }
        // Conservative hold: upper-bounded data and recent context + model output.
        // Actual provider usage is recorded exactly at settlement, including reasoning tokens.
        $chars = mb_strlen(json_encode($context, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE));
        $hold = (int) ceil($chars / 1.5) + $maxOutput
            + ($feature === 'pmp_followup' ? 5000 : 2000);
        $hold = min(30000, max(2500, $hold));
        if ((int) $bucket->used_tokens + (int) $bucket->reserved_tokens + $hold > $allocated) {
            throw new AiFailure('AI_TOKEN_LIMIT_REACHED', 429);
        }
        DB::table('ai_chat_usage_buckets')->where('id', $bucket->id)->update([
            'reserved_tokens' => (int) $bucket->reserved_tokens + $hold,
            'version' => (int) $bucket->version + 1,
        ]);
        DB::table('ai_pmp_token_allocations')->insert([
            'request_id' => $requestId, 'bucket_id' => $bucket->id,
            'reserved_tokens' => $hold, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->event($requestId, (int) $bucket->id, 'reserve', $hold, 0);
    }

    /** Called inside the same settlement/refund transaction as credits and reply quotas. */
    public function finish(int $requestId, ?int $actualTokens): void
    {
        $hold = DB::table('ai_pmp_token_allocations')->where('request_id', $requestId)
            ->lockForUpdate()->first();
        if (! $hold || $hold->state !== 'reserved') {
            return;
        }
        $bucket = DB::table('ai_chat_usage_buckets')->where('id', $hold->bucket_id)
            ->lockForUpdate()->first();
        if (! $bucket || (int) $bucket->reserved_tokens < (int) $hold->reserved_tokens) {
            throw new AiFailure('TOKEN_RECONCILIATION_REQUIRED', 503);
        }
        $actual = max(0, $actualTokens ?? 0);
        DB::table('ai_chat_usage_buckets')->where('id', $bucket->id)->update([
            'reserved_tokens' => (int) $bucket->reserved_tokens - (int) $hold->reserved_tokens,
            'used_tokens' => (int) $bucket->used_tokens + $actual,
            'version' => (int) $bucket->version + 1,
        ]);
        DB::table('ai_pmp_token_allocations')->where('request_id', $requestId)->update([
            'actual_tokens' => $actual, 'state' => $actualTokens === null ? 'released' : 'settled',
            'updated_at' => now(),
        ]);
        $this->event($requestId, (int) $bucket->id, $actualTokens === null ? 'release' : 'settle',
            -(int) $hold->reserved_tokens, $actual);
    }

    private function event(int $requestId, int $bucketId, string $kind, int $reserved, int $used): void
    {
        DB::table('ai_pmp_token_events')->insert([
            'request_id' => $requestId, 'bucket_id' => $bucketId,
            'kind' => $kind, 'reserved_delta' => $reserved,
            'used_delta' => $used, 'created_at' => now(),
        ]);
    }
}
