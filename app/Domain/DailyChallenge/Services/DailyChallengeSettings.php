<?php

namespace App\Domain\DailyChallenge\Services;

use Illuminate\Support\Facades\DB;

/** Database-backed admin policy; only non-secret controls are editable in the browser. */
final class DailyChallengeSettings
{
    public function get(): object
    {
        return DB::table('daily_challenge_settings')->where('id', 1)->firstOrFail();
    }

    public function isReady(): bool
    {
        return (bool) config('pm-ai.enabled') && (bool) config('pm-ai.editorial_enabled')
            && app(\App\Domain\AI\Services\AiFeatureRouting::class)->configured('scenario_generate', 'daily_challenge_api_key');
    }

    public function closeExpired(): int
    {
        return DB::table('scenarios')->where('ai_generated', true)
            ->where('status', 'published')->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())->update(['status' => 'closed', 'updated_at' => now()]);
    }
}
