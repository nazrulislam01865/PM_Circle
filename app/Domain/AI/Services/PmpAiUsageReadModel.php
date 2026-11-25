<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** The member dashboard uses the same cycle quota as the PMP question tutor. */
final class PmpAiUsageReadModel
{
    public function __construct(private readonly AiChatQuotaService $quotas) {}

    public function summary(User $user, bool $includeActivity = true): array
    {
        try {
            $usage = $this->quotas->summary($user, 'pmp_explain');
        } catch (AiFailure $exception) {
            // Expected configuration gaps do not become misleading zero balances.
            // Unexpected authorization/accounting failures must never be silently swallowed.
            if (! in_array($exception->safeCode, ['CHAT_POLICY_NOT_CONFIGURED', 'NOT_ENTITLED'], true)) {
                throw $exception;
            }
            return [
                'configured' => false, 'allocated' => 0, 'used' => 0,
                'reserved' => 0, 'remaining' => 0, 'activity' => [],
            ];
        }

        $tokens = $usage['tokens'] ?? null;
        $cycle = $usage['cycle'] ?? null;
        if (! is_array($tokens) || ! is_array($cycle)) {
            return [
                'configured' => false, 'allocated' => 0, 'used' => 0,
                'reserved' => 0, 'remaining' => 0, 'activity' => [],
            ];
        }

        // Two feature rows at most, using ai_requests(user_id, created_at). No transcript loading.
        $activity = $includeActivity ? DB::table('ai_requests')
            ->where('user_id', $user->id)
            ->whereIn('feature_code', ['pmp_explain', 'pmp_followup'])
            ->where('status', 'completed')
            ->where('created_at', '>=', Carbon::parse($cycle['start_at']))
            ->where('created_at', '<', Carbon::parse($cycle['reset_at']))
            ->groupBy('feature_code')
            ->select('feature_code')
            ->selectRaw('COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens')
            ->get()->map(static fn ($row): array => [
                'kind' => $row->feature_code === 'pmp_explain' ? 'question_explanation' : 'follow_up',
                'tokens' => (int) $row->total_tokens,
            ])->all() : [];

        return [
            'configured' => true,
            'allocated' => (int) $tokens['allocated'],
            'used' => (int) $tokens['used'],
            'reserved' => (int) $tokens['pending'],
            'remaining' => (int) $tokens['remaining'],
            'reset_at' => $tokens['reset_at'],
            'activity' => $activity,
        ];
    }
}
