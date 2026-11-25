<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/** Meter synchronous provider calls without storing private input or deducting member credits. */
final class AiDirectUsage
{
    public function __construct(private readonly AiBudgetService $budget) {}

    public function begin(string $feature, string $model, array $price, float $estimate, array $credential, ?string $runTable = null, ?int $runId = null, string $provider = 'openai', string $subjectType = 'workspace_direct'): int
    {
        return DB::transaction(function () use ($feature, $model, $price, $estimate, $credential, $runTable, $runId, $provider, $subjectType): int {
            $id = DB::table('ai_requests')->insertGetId([
                'request_uuid' => (string) Str::uuid(), 'feature_code' => $feature, 'subject_type' => $subjectType,
                'status' => 'running', 'provider' => $provider, 'model' => $model, 'payload_encrypted' => Crypt::encryptString('{}'),
                'model_price_snapshot' => json_encode($price, JSON_THROW_ON_ERROR), 'lease_until' => now()->addMinutes(3),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->budget->reserveAmount($id, $feature, $estimate);
            $this->budget->reserveCredential($id, $credential);
            if ($runId && in_array($runTable, ['post_check_runs', 'comment_check_runs'], true)) {
                DB::table($runTable)->where('id', $runId)->update(['workspace_accounted' => true, 'credential_ref' => $credential['ref'], 'credential_day' => now('UTC')->toDateString()]);
            }
            return $id;
        }, 3);
    }

    public function settle(int $id, mixed $input, mixed $output, mixed $cached = 0, ?string $errorCode = null): void
    {
        if (! is_numeric($input) || ! is_numeric($output) || ! is_numeric($cached) || $input < 0 || $output < 0 || $cached < 0 || $cached > $input) {
            $this->unknown($id);
            throw new AiFailure('PROVIDER_STATUS_UNKNOWN', 503);
        }
        DB::transaction(function () use ($id, $input, $output, $cached, $errorCode): void {
            $row = DB::table('ai_requests')->where('id', $id)->lockForUpdate()->first();
            if (! $row || $row->status !== 'running') return;
            $price = json_decode($row->model_price_snapshot, true, 512, JSON_THROW_ON_ERROR);
            $cost = number_format((($input - $cached) * (float) $price['input'] + $cached * (float) $price['cached'] + $output * (float) $price['output']) / 1000000, 9, '.', '');
            $this->budget->finish($id, $cost);
            if ($row->credential_ref && $row->subject_type !== 'workspace_credential_test') DB::afterCommit(fn () => app(AiCredentialHealth::class)->success($row->credential_ref));
            DB::table('ai_requests')->where('id', $id)->update(['status' => $errorCode === null ? 'completed' : 'failed', 'error_code' => $errorCode, 'input_tokens' => (int) $input, 'cached_tokens' => (int) $cached, 'output_tokens' => (int) $output, 'cost_usd' => $cost, 'completed_at' => now(), 'lease_until' => null, 'updated_at' => now()]);
        }, 3);
    }

    public function reject(int $id, string $code): void
    {
        DB::transaction(function () use ($id, $code): void {
            $row = DB::table('ai_requests')->where('id', $id)->lockForUpdate()->first();
            if (! $row || $row->status !== 'running') return;
            $this->budget->finish($id, null);
            DB::table('ai_requests')->where('id', $id)->update(['status' => 'failed', 'error_code' => $code, 'completed_at' => now(), 'lease_until' => null, 'updated_at' => now()]);
        }, 3);
    }

    public function unknown(int $id): void
    {
        // Keep the financial reservation for operator reconciliation, never resend automatically.
        DB::table('ai_requests')->where('id', $id)->where('status', 'running')->update(['status' => 'provider_status_unknown', 'error_code' => 'RECONCILING', 'updated_at' => now()]);
    }
}
