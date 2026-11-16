<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use App\Models\User;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Independent count quota. Bucket locks must precede wallet/grant locks in every request transaction. */
final class AiChatQuotaService
{
    public function __construct(private readonly CurrentMemberPlan $plans) {}

    public function policy(User $user, string $feature): array
    {
        $code = $this->plans->code($user);
        $scope = app(AiFeatureCatalog::class)->family($feature);
        $now = now();
        $policy = DB::table('ai_chat_limit_policies')->where('plan_code', $code)
            ->where('feature_scope', $scope)->where('enabled', true)
            ->where('active_from_utc', '<=', $now)->orderByDesc('active_from_utc')
            ->orderByDesc('version')->first();
        if (! $policy) {
            throw new AiFailure('CHAT_POLICY_NOT_CONFIGURED', 503);
        }
        $override = DB::table('ai_chat_user_overrides')->where('user_id', $user->id)
            ->where('feature_scope', $scope)->where('status', 'active')
            ->where('starts_at_utc', '<=', $now)
            ->where(fn ($q) => $q->whereNull('ends_at_utc')->orWhere('ends_at_utc', '>', $now))
            ->orderByDesc('starts_at_utc')->orderByDesc('version')->first();
        $limits = [];
        foreach (['max_daily', 'max_cycle', 'max_per_conversation', 'max_concurrent'] as $key) {
            $limits[$key] = min((int) ($override?->{$key} ?? $policy->{$key}),
                (int) config('pm-ai.hard_chat_'.match ($key) {
                    'max_daily' => 'daily', 'max_cycle' => 'cycle',
                    'max_per_conversation' => 'conversation', default => 'concurrent',
                }));
        }
        if ($scope === 'feature:pmp') {
            $limits['max_cycle_tokens'] = min(
                (int) ($override?->max_cycle_tokens ?? $policy->max_cycle_tokens ?? 0),
                (int) config('pm-ai.hard_pmp_cycle_tokens')
            );
        }
        return ['version' => (int) $policy->version, 'family' => $scope, 'limits' => $limits];
    }

    /** Safe for prepaid multi-month plans: derive cycles anchored to the actual subscription start. */
    private function windows(User $user): array
    {
        $local = now('Asia/Dhaka');
        $dayStart = $local->copy()->startOfDay()->utc();
        $details = $this->plans->details($user);
        if ($details['source'] === 'subscription' && $details['starts_at'] && $details['ends_at']) {
            $start = Carbon::parse($details['starts_at'])->utc();
            $end = Carbon::parse($details['ends_at'])->utc();
            $number = 0;
            while ($number < 60 && $start->copy()->addMonthsNoOverflow($number + 1)->lte(now())) {
                $number++;
            }
            $cycleStart = $start->copy()->addMonthsNoOverflow($number);
            $cycleEnd = $start->copy()->addMonthsNoOverflow($number + 1);
            if ($cycleEnd->gt($end)) {
                $cycleEnd = $end;
            }
            if ($cycleStart->gt(now()) || $cycleEnd->lte(now())) {
                throw new AiFailure('NOT_ENTITLED', 403);
            }
        } elseif ($details['source'] === 'complimentary' && config('pm-ai.allow_demo_credit_grants')) {
            $cycleStart = $local->copy()->startOfMonth()->utc();
            $cycleEnd = $local->copy()->addMonthNoOverflow()->startOfMonth()->utc();
        } else {
            throw new AiFailure('NOT_ENTITLED', 403);
        }
        return ['day' => [$dayStart, $dayStart->copy()->addDay()],
            'cycle' => [$cycleStart, $cycleEnd]];
    }

    public function reserve(User $user, int $requestId, string $feature, ?int $conversationId): array
    {
        $policy = $this->policy($user, $feature);
        $windows = $this->windows($user);
        $family = $policy['family'];
        $limits = $policy['limits'];
        $specs = [];
        foreach (['day', 'cycle'] as $kind) {
            [$start, $end] = $windows[$kind];
            $limit = $kind === 'day' ? $limits['max_daily'] : $limits['max_cycle'];
            $specs[] = ['all-chat', $kind, $start, $end,
                (int) config('pm-ai.hard_chat_'.($kind === 'day' ? 'daily' : 'cycle'))];
            $specs[] = [$family, $kind, $start, $end, $limit];
        }
        if ($conversationId) {
            $specs[] = ["conversation:{$conversationId}", 'conversation',
                Carbon::parse('2000-01-01', 'UTC'), Carbon::parse('2100-01-01', 'UTC'),
                $limits['max_per_conversation']];
        }
        $specs[] = [$family, 'concurrent', Carbon::parse('2000-01-01', 'UTC'),
            Carbon::parse('2100-01-01', 'UTC'), $limits['max_concurrent']];
        usort($specs, fn ($a, $b) => strcmp($a[0].':'.$a[1], $b[0].':'.$b[1]));
        foreach ($specs as [$scope, $kind, $start, $end]) {
            DB::table('ai_chat_usage_buckets')->insertOrIgnore([
                'user_id' => $user->id, 'scope_key' => $scope,
                'window_kind' => $kind, 'window_start_utc' => $start,
                'window_end_utc' => $end,
            ]);
        }
        $snap = [];
        foreach ($specs as [$scope, $kind, $start, $end, $limit]) {
            $bucket = DB::table('ai_chat_usage_buckets')->where('user_id', $user->id)
                ->where('scope_key', $scope)->where('window_kind', $kind)
                ->where('window_start_utc', $start)->lockForUpdate()->first();
            if ($bucket->completed_count + $bucket->reserved_count >= $limit) {
                throw new AiFailure($kind === 'conversation' ? 'CONVERSATION_LIMIT_REACHED' : 'CHAT_LIMIT_REACHED',
                    $kind === 'conversation' ? 409 : 429);
            }
            DB::table('ai_chat_usage_buckets')->where('id', $bucket->id)->update([
                'reserved_count' => $bucket->reserved_count + 1,
                'version' => $bucket->version + 1,
            ]);
            DB::table('ai_chat_request_allocations')->insert([
                'request_id' => $requestId, 'bucket_id' => $bucket->id, 'state' => 'reserved',
            ]);
            $this->event($requestId, $bucket->id, 'reserve', 0, 1);
            $snap[] = ['scope' => $scope, 'kind' => $kind, 'limit' => $limit,
                'reset_at' => $kind === 'concurrent' || $kind === 'conversation' ? null : $end->toISOString()];
        }
        return ['policy_version' => $policy['version'], 'buckets' => $snap,
            'pmp_tokens' => $family === 'feature:pmp'
                ? ['allocated' => (int) ($limits['max_cycle_tokens'] ?? 0),
                    'cycle_start' => $windows['cycle'][0]] : null];
    }

    public function finish(int $requestId, bool $successful): void
    {
        $rows = DB::table('ai_chat_request_allocations')->where('request_id', $requestId)
            ->orderBy('bucket_id')->lockForUpdate()->get();
        foreach ($rows as $row) {
            if ($row->state !== 'reserved') {
                continue;
            }
            $bucket = DB::table('ai_chat_usage_buckets')->where('id', $row->bucket_id)->lockForUpdate()->first();
            if (! $bucket || $bucket->reserved_count < 1) {
                throw new AiFailure('QUOTA_RECONCILIATION_REQUIRED', 503);
            }
            $counted = $successful && $bucket->window_kind !== 'concurrent';
            DB::table('ai_chat_usage_buckets')->where('id', $bucket->id)->update([
                'completed_count' => $bucket->completed_count + (int) $counted,
                'reserved_count' => $bucket->reserved_count - 1,
                'version' => $bucket->version + 1,
            ]);
            DB::table('ai_chat_request_allocations')->where('id', $row->id)->update([
                'state' => $successful ? 'settled' : 'released',
            ]);
            $this->event($requestId, $bucket->id, $counted ? 'settle' : 'release',
                (int) $counted, -1);
        }
    }

    private function event(int $requestId, int $bucketId, string $kind, int $completed, int $reserved): void
    {
        DB::table('ai_chat_usage_events')->insert([
            'request_id' => $requestId, 'bucket_id' => $bucketId,
            'kind' => $kind, 'completed_delta' => $completed,
            'reserved_delta' => $reserved,
            'event_ref' => "request:{$requestId}:bucket:{$bucketId}:{$kind}", 'created_at' => now(),
        ]);
    }

    public function summary(User $user, string $feature, ?int $conversationId = null): array
    {
        $policy = $this->policy($user, $feature);
        $windows = $this->windows($user);
        $result = ['enabled' => true, 'policy_version' => $policy['version']];
        foreach ($windows as $kind => [$start, $end]) {
            $bucket = DB::table('ai_chat_usage_buckets')->where('user_id', $user->id)
                ->where('scope_key', $policy['family'])->where('window_kind', $kind)
                ->where('window_start_utc', $start)
                ->first(['completed_count', 'reserved_count', 'used_tokens', 'reserved_tokens']);
            $result[$kind === 'day' ? 'daily' : 'cycle'] = [
                'used' => $bucket?->completed_count ?? 0, 'pending' => $bucket?->reserved_count ?? 0,
                'limit' => $policy['limits'][$kind === 'day' ? 'max_daily' : 'max_cycle'],
                'start_at' => $start->toISOString(), 'reset_at' => $end->toISOString(),
            ];
            if ($kind === 'cycle' && $policy['family'] === 'feature:pmp') {
                // One indexed read also supplies the PMP provider-token usage snapshot.
                $allocated = (int) ($policy['limits']['max_cycle_tokens'] ?? 0);
                $used = (int) ($bucket?->used_tokens ?? 0);
                $pending = (int) ($bucket?->reserved_tokens ?? 0);
                $result['tokens'] = ['allocated' => $allocated, 'used' => $used,
                    'pending' => $pending, 'remaining' => max(0, $allocated - $used - $pending),
                    'reset_at' => $end->toISOString()];
            }
        }
        if ($conversationId !== null) {
            $conversation = DB::table('ai_conversations')->where('id', $conversationId)
                ->where('user_id', $user->id)->where('status', 'active')
                ->where('feature_scope', $policy['family'])->first(['id']);
            if (! $conversation) {
                throw new AiFailure('SUBJECT_NOT_ACCESSIBLE', 404);
            }
            $bucket = DB::table('ai_chat_usage_buckets')->where('user_id', $user->id)
                ->where('scope_key', 'conversation:'.$conversationId)
                ->where('window_kind', 'conversation')->first();
            $result['conversation'] = ['used' => $bucket?->completed_count ?? 0,
                'pending' => $bucket?->reserved_count ?? 0,
                'limit' => $policy['limits']['max_per_conversation']];
        }
        return $result;
    }
}
