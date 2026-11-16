<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\DB;

/** Provider-USD hard admission budgets; independent of member service credit tariffs. */
final class AiBudgetService
{
    public function reserve(int $requestId, string $feature, array $context, array $prices,
        int $maxOutput): void
    {
        // Conservative admission estimate; actual usage reconciles after the provider responds.
        $inputChars = max(mb_strlen(json_encode($context, JSON_THROW_ON_ERROR)),
            (int) ($context['context']['estimated_input_chars'] ?? 0));
        $inputEstimate = (int) ceil($inputChars / 2.5) + 800;
        $usd = max(0.000001, ceil((($inputEstimate * (float) $prices['input']
            + $maxOutput * (float) $prices['output']) / 1000000) * 1.2 * 1000000000) / 1000000000);
        $limits = ['global' => (float) config('pm-ai.global_daily_budget_usd', 0)];
        if (in_array($feature, ['scenario_generate', 'trend_draft'], true)) {
            $limits['editorial'] = (float) config('pm-ai.editorial_budget_usd', 0);
        }
        foreach ($limits as $scope => $limit) {
            if ($limit <= 0) {
                throw new AiFailure('BUDGET_NOT_CONFIGURED', 503);
            }
            $day = now('UTC')->toDateString();
            DB::table('ai_budget_usage')->insertOrIgnore([
                'scope' => $scope, 'utc_day' => $day,
                'reserved_usd' => 0, 'spent_usd' => 0,
            ]);
            $bucket = DB::table('ai_budget_usage')->where('scope', $scope)
                ->where('utc_day', $day)->lockForUpdate()->first();
            if ((float) $bucket->spent_usd + (float) $bucket->reserved_usd + $usd > $limit + 0.0000000001) {
                throw new AiFailure('DAILY_AI_BUDGET_REACHED', 503);
            }
            DB::table('ai_budget_usage')->where('id', $bucket->id)->update([
                'reserved_usd' => number_format((float) $bucket->reserved_usd + $usd, 9, '.', ''),
                'version' => $bucket->version + 1,
            ]);
            DB::table('ai_request_budget_allocations')->insert([
                'request_id' => $requestId, 'bucket_id' => $bucket->id,
                'reserved_usd' => number_format($usd, 9, '.', ''),
            ]);
        }
    }

    public function finish(int $requestId, ?string $actualUsd): void
    {
        $allocations = DB::table('ai_request_budget_allocations')->where('request_id', $requestId)
            ->orderBy('bucket_id')->lockForUpdate()->get();
        foreach ($allocations as $allocation) {
            if ($allocation->finalized) {
                continue;
            }
            $bucket = DB::table('ai_budget_usage')->where('id', $allocation->bucket_id)
                ->lockForUpdate()->first();
            $actual = $actualUsd === null ? 0 : (float) $actualUsd;
            DB::table('ai_budget_usage')->where('id', $bucket->id)->update([
                'reserved_usd' => number_format(max(0, (float) $bucket->reserved_usd - (float) $allocation->reserved_usd), 9, '.', ''),
                'spent_usd' => number_format((float) $bucket->spent_usd + $actual, 9, '.', ''),
                'version' => $bucket->version + 1,
            ]);
            DB::table('ai_request_budget_allocations')->where('id', $allocation->id)->update([
                'actual_usd' => number_format($actual, 9, '.', ''), 'finalized' => true,
            ]);
        }
    }
}
