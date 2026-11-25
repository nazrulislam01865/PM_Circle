<?php

namespace App\Domain\AI\Services;

use App\Jobs\BroadcastNotificationUpdate;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/** Bounded, secret-free runtime health events and deduplicated administrator alerts. */
final class AiCredentialHealth
{
    public function failure(string $ref, string $code): void
    {
        if (! preg_match('/^credential:(?:[0-9]+|env:[a-z_]+)$/D', $ref)) return;
        try {
            if (in_array($code, ['PROVIDER_AUTH_FAILED','PROVIDER_PERMISSION_DENIED','PROVIDER_QUOTA_EXHAUSTED','PROVIDER_MODEL_NOT_FOUND','PROVIDER_RATE_LIMITED','POST_CHECK_KEY_DENIED','POST_CHECK_RATE_LIMITED'], true)) Cache::put('pm:ai-credential-backoff:'.hash('sha256', $ref), true, now()->addSeconds(60));
            Cache::put('pm:ai-credential-failure:'.hash('sha256', $ref), true, now()->addDay());
            $cacheKey = 'pm:ai-health:'.hash('sha256', $ref.'|'.$code);
            if (! Cache::add($cacheKey, true, now()->addMinutes(30))) return;
            $id = (int) substr($ref, strlen('credential:'));
            $name = $id ? DB::table('ai_workspace_credentials')->where('id', $id)->value('name') : (AiRuntimeSettings::SLOTS[substr($ref, strlen('credential:env:'))]['name'] ?? 'Environment credential');
            $safe = in_array($code, ['PROVIDER_AUTH_FAILED', 'PROVIDER_PERMISSION_DENIED', 'PROVIDER_QUOTA_EXHAUSTED', 'PROVIDER_MODEL_NOT_FOUND', 'PROVIDER_RATE_LIMITED', 'PROVIDER_REJECTED', 'PROVIDER_UNAVAILABLE', 'PROVIDER_STATUS_UNKNOWN', 'POST_CHECK_KEY_DENIED', 'POST_CHECK_RATE_LIMITED', 'POST_CHECK_PROVIDER_UNAVAILABLE'], true) ? $code : 'PROVIDER_FAILURE';
            if ($id) DB::table('ai_workspace_credentials')->where('id', $id)->update(['health_code' => $safe, 'checked_at' => now()]);
            else app(AiWorkspaceCredentials::class)->recordEnvironmentHealth(substr($ref, strlen('credential:env:')), $safe);
            app(AiAdminAccess::class)->audit(null, 'credential.runtime.failure', 'ai_workspace_credentials', $id, null, ['code' => $safe], ($id ? ($name ?? 'Credential') : 'Environment credential '.substr($ref, strlen('credential:env:'))).': '.$safe);
            // Notify only active verified administrators; no prompt, secret or upstream response.
            User::query()->where('is_admin', true)->where('status', 'active')->whereNotNull('email_verified_at')->select('id')->chunkById(100, function ($admins) use ($ref, $safe, $name): void {
                $rows = $admins->map(fn ($admin) => ['id' => (string) Str::uuid(), 'type' => 'ai_health', 'notifiable_type' => User::class, 'notifiable_id' => $admin->id,
                    'event_key' => 'ai-health:'.hash('sha256', $ref.'|'.$safe.'|'.intdiv(now()->timestamp, 1800)), 'data' => json_encode(['message' => ($name ?? 'AI credential').' requires attention: '.$safe, 'url' => '/admin/ai/workspace/health']), 'created_at' => now(), 'updated_at' => now()])->all();
                DB::table('notifications')->insertOrIgnore($rows);
                foreach ($admins as $admin) BroadcastNotificationUpdate::dispatch($admin->id)->onQueue('default');
            });
        } catch (Throwable) { /* Health reporting must never interrupt financial settlement or safety checks. */ }
    }

    public function success(string $ref): void
    {
        try {
            if (! Cache::pull('pm:ai-credential-failure:'.hash('sha256', $ref))) return;
            Cache::forget('pm:ai-credential-backoff:'.hash('sha256', $ref));
            $id = (int) substr($ref, strlen('credential:'));
            if ($id) DB::table('ai_workspace_credentials')->where('id', $id)->where(fn ($q) => $q->whereNull('health_code')->orWhere('health_code', '!=', 'OPERATION_VERIFIED'))->update(['health_code' => 'RUNTIME_RECOVERED', 'checked_at' => now()]);
            else app(AiWorkspaceCredentials::class)->recordEnvironmentRecovery(substr($ref, strlen('credential:env:')));
            $label = $id ? 'Credential recovered' : 'Environment credential '.substr($ref, strlen('credential:env:'));
            app(AiAdminAccess::class)->audit(null, 'credential.runtime.recovered', 'ai_workspace_credentials', $id, null, null, $label.': RUNTIME_RECOVERED');
        } catch (Throwable) { /* Health recovery must not affect business operations. */ }
    }

}
