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
        $prices = app(AiFeatureRouting::class)->snapshot($requestId, $feature, $prices);
        // Conservative admission estimate; actual usage reconciles after the provider responds.
        $inputChars = max(mb_strlen(json_encode($context, JSON_THROW_ON_ERROR)),
            (int) ($context['context']['estimated_input_chars'] ?? 0));
        $inputEstimate = (int) ceil($inputChars / 2.5) + 800;
        $usd = max(0.000001, ceil((($inputEstimate * (float) $prices['input']
            + $maxOutput * (float) $prices['output']) / 1000000) * 1.2 * 1000000000) / 1000000000);
        $this->reserveAmount($requestId, $feature, $usd);
    }

    /** Must run inside the same transaction as request creation. */
    public function reserveAmount(int $requestId, string $feature, float $usd): void
    {
        $runtime = app(AiRuntimeSettings::class);
        $day = now('UTC')->toDateString();
        $month = now('UTC')->startOfMonth()->toDateString();
        $featureLimit = app(AiFeatureRouting::class)->route($feature)?->daily_usd;
        $limits = [
            ['global-month', $month, $runtime->monthlyBudget()],
            ['global', $day, $runtime->budget('global_daily_budget_usd')],
            ['feature:'.$feature, $day, $featureLimit === null ? null : (float) $featureLimit],
        ];
        if (in_array($feature, ['scenario_generate', 'trend_draft'], true)) {
            $limits[] = ['editorial', $day, $runtime->budget('editorial_budget_usd')];
        }
        if ($feature === 'feed_moderation') {
            $limits[] = ['moderation', $day, $runtime->budget('post_check_daily_budget_usd')];
        }
        foreach ($limits as [$scope, $date, $limit]) {
            if ($limit !== null && $limit <= 0 && $usd > 0) {
                throw new AiFailure('BUDGET_NOT_CONFIGURED', 503);
            }
            DB::table('ai_budget_usage')->insertOrIgnore(['scope' => $scope, 'utc_day' => $date, 'reserved_usd' => 0, 'spent_usd' => 0]);
            $bucket = DB::table('ai_budget_usage')->where('scope', $scope)->where('utc_day', $date)->lockForUpdate()->first();
            if ($limit !== null && (float) $bucket->spent_usd + (float) $bucket->reserved_usd + $usd > $limit + 0.0000000001) {
                throw new AiFailure($scope === 'global-month' ? 'MONTHLY_AI_BUDGET_REACHED' : ($scope === 'feature:'.$feature ? 'FEATURE_AI_BUDGET_REACHED' : 'DAILY_AI_BUDGET_REACHED'), 503);
            }
            DB::table('ai_budget_usage')->where('id', $bucket->id)->update([
                'reserved_usd' => number_format((float) $bucket->reserved_usd + $usd, 9, '.', ''), 'version' => $bucket->version + 1,
            ]);
            DB::table('ai_request_budget_allocations')->insert(['request_id' => $requestId, 'bucket_id' => $bucket->id, 'reserved_usd' => number_format($usd, 9, '.', '')]);
        }
    }

    /** Reserve against the credential actually selected at execution, using the existing global hold. */
    public function reserveCredential(int $requestId, array $credential): void
    {
        DB::transaction(function () use ($requestId, $credential): void {
            $request = DB::table('ai_requests')->where('id', $requestId)->lockForUpdate()->first(['status']);
            if ($request?->status !== 'running') throw new AiFailure('FEATURE_UNAVAILABLE', 503);
            $hold = DB::table('ai_request_budget_allocations as a')->join('ai_budget_usage as b', 'b.id', '=', 'a.bucket_id')
                ->where('a.request_id', $requestId)->where('b.scope', 'global')->where('a.finalized', false)->value('a.reserved_usd');
            if ($hold === null) throw new AiFailure('BUDGET_NOT_CONFIGURED', 503);
            $day = now('UTC')->toDateString();
            DB::table('ai_budget_usage')->insertOrIgnore(['scope' => $credential['ref'], 'utc_day' => $day, 'reserved_usd' => 0, 'spent_usd' => 0]);
            $bucket = DB::table('ai_budget_usage')->where('scope', $credential['ref'])->where('utc_day', $day)->lockForUpdate()->first();
            if ($credential['limit'] !== null && ((float) $bucket->spent_usd + (float) $bucket->reserved_usd + (float) $hold > $credential['limit'] + 0.0000000001)) {
                throw new AiFailure('DAILY_AI_BUDGET_REACHED', 503);
            }
            DB::table('ai_request_budget_allocations')->insert(['request_id' => $requestId, 'bucket_id' => $bucket->id, 'reserved_usd' => $hold]);
            DB::table('ai_requests')->where('id', $requestId)->update(['credential_ref' => $credential['ref']]);
            DB::table('ai_budget_usage')->where('id', $bucket->id)->update([
                'reserved_usd' => number_format((float) $bucket->reserved_usd + (float) $hold, 9, '.', ''), 'version' => $bucket->version + 1,
            ]);
        }, 3);
    }

    /** Release only the attempted key hold after a definitively non-billable rejection. */
    public function releaseCredential(int $requestId): void
    {
        DB::transaction(function () use ($requestId): void {
            DB::table('ai_requests')->where('id', $requestId)->lockForUpdate()->first();
            $allocations = DB::table('ai_request_budget_allocations as a')->join('ai_budget_usage as b', 'b.id', '=', 'a.bucket_id')
                ->where('a.request_id', $requestId)->where('a.finalized', false)->where('b.scope', 'like', 'credential:%')->get(['a.id', 'a.bucket_id', 'a.reserved_usd']);
            foreach ($allocations as $allocation) {
                $bucket = DB::table('ai_budget_usage')->where('id', $allocation->bucket_id)->lockForUpdate()->first();
                DB::table('ai_budget_usage')->where('id', $bucket->id)->update(['reserved_usd' => number_format(max(0, (float) $bucket->reserved_usd - (float) $allocation->reserved_usd), 9, '.', ''), 'version' => $bucket->version + 1]);
                DB::table('ai_request_budget_allocations')->where('id', $allocation->id)->update(['finalized' => true, 'actual_usd' => 0]);
            }
            DB::table('ai_requests')->where('id', $requestId)->update(['credential_ref' => null]);
        }, 3);
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
