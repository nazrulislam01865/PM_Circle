<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AiWorkspaceCredentials
{
    public function rows(?array $providerProfiles = null, string|array|null $slotFilter = null): array
    {
        $assignments = DB::table('ai_workspace_slots')->when($slotFilter, fn ($query) => $query->whereIn('slot', (array) $slotFilter))->pluck('credential_id', 'slot');
        $primaries = DB::table('ai_workspace_feature_routes')->whereNotNull('primary_credential_id')->pluck('primary_credential_id')->map(fn ($id) => (int) $id)->all();
        $profiles = $providerProfiles === null ? DB::table('ai_workspace_providers')->get(['id', 'name', 'adapter', 'status', 'is_default']) : collect($providerProfiles)->map(fn ($profile) => (object) $profile);
        $defaults = $profiles->where('is_default', true)->keyBy('adapter');
        $byId = $profiles->keyBy('id');
        $rows = DB::table('ai_workspace_credentials')->when($slotFilter, fn ($query) => $query->whereIn('slot', (array) $slotFilter))->orderBy('slot')->orderBy('priority')->orderBy('id')->get([
            'id', 'name', 'slot', 'suffix', 'enabled', 'health_code', 'checked_at', 'provider_id', 'priority', 'daily_budget_usd', 'pool_label',
        ])->map(fn ($row) => [...(array) $row, 'id' => (string) $row->id,
            'status' => ! $row->enabled ? 'Disabled' : ((int) $assignments->get($row->slot) === (int) $row->id || in_array((int) $row->id, $primaries, true) ? 'Active' : 'Standby'),
            'provider_name' => $byId->get($row->provider_id)?->name, 'provider_status' => $byId->get($row->provider_id)?->status,
            'slot_active' => (int) $assignments->get($row->slot) === (int) $row->id, 'source' => 'registry', 'provider' => AiRuntimeSettings::SLOTS[$row->slot]['provider'],
            'pool' => $row->pool_label ?? AiRuntimeSettings::SLOTS[$row->slot]['pool'], 'routing_target' => AiRuntimeSettings::SLOTS[$row->slot]['name']])->all();
        foreach (AiRuntimeSettings::SLOTS as $slot => $metadata) {
            if ($slotFilter !== null && ! in_array($slot, (array) $slotFilter, true)) continue;
            $environmentKey = config('pm-ai.'.$slot);
            $configured = is_string($environmentKey) && $environmentKey !== '';
            $default = $defaults->get($metadata['provider']);
            $rows[] = [...$metadata, 'provider_id' => $default?->id, 'provider_name' => $default?->name, 'provider_status' => $default?->status, 'id' => 'env:'.$slot, 'slot' => $slot, 'suffix' => $configured && strlen($environmentKey) >= 12 ? substr($environmentKey, -4) : null, 'priority' => null, 'daily_budget_usd' => null,
                'enabled' => $configured, 'status' => ! $configured ? 'Not configured' : ($assignments->get($slot) || $default?->status !== 'Active' ? 'Standby' : 'Active'),
                'slot_active' => $configured && ! $assignments->get($slot) && $default?->status === 'Active', 'source' => 'environment', 'routing_target' => $metadata['name'], ...($configured ? Cache::get($this->environmentCacheKey($slot), ['health_code' => null, 'checked_at' => null]) : ['health_code' => null, 'checked_at' => null])];
        }
        return $rows;
    }

    /** Safe health metadata for the effective route, independent of feature diagnostics. */
    public function healthFor(?array $account, string $slot): array
    {
        $ref = $account['ref'] ?? null;
        if ($ref === 'credential:env:'.$slot) {
            $health = Cache::get($this->environmentCacheKey($slot), []);
        } elseif (is_string($ref) && preg_match('/^credential:([0-9]+)$/D', $ref, $match)) {
            $health = (array) DB::table('ai_workspace_credentials')->where('id', (int) $match[1])->first(['health_code', 'checked_at']);
        } else {
            $health = [];
        }
        return ['credential_health_code' => $health['health_code'] ?? null, 'credential_checked_at' => isset($health['checked_at']) ? \Illuminate\Support\Carbon::parse($health['checked_at'])->toIso8601String() : null];
    }

    /** Test the actual operation with the supplied credential; no model-list permission is required. */
    public function probe(string $slot, #[\SensitiveParameter] string $secret, ?array $account = null): string
    {
        return app(AiCredentialDiagnostic::class)->run($slot, $secret, $account ?? ['ref' => 'credential:rotation:'.$slot, 'limit' => null]);
    }

    private function environmentCacheKey(string $slot): string
    {
        return 'pm:ai-workspace:env:'.hash_hmac('sha256', json_encode([$slot, config('pm-ai.'.$slot), config('pm-ai.post_check_provider')]), (string) config('app.key'));
    }

    public function recordEnvironmentHealth(string $slot, string $code): void
    {
        if (array_key_exists($slot, AiRuntimeSettings::SLOTS)) Cache::put($this->environmentCacheKey($slot), ['health_code' => $code, 'checked_at' => now()->toIso8601String()], now()->addMinutes(15));
    }

    public function recordEnvironmentRecovery(string $slot): void
    {
        if (! array_key_exists($slot, AiRuntimeSettings::SLOTS)) return;
        if (data_get(Cache::get($this->environmentCacheKey($slot)), 'health_code') !== 'OPERATION_VERIFIED') {
            $this->recordEnvironmentHealth($slot, 'RUNTIME_RECOVERED');
        }
    }

    public function testEnvironment(string $slot, int $actor, AiAdminAccess $access): string
    {
        $secret = config('pm-ai.'.$slot);
        abort_unless(is_string($secret) && $secret !== '', 422, 'No environment credential is configured.');
        abort_unless(DB::table('ai_workspace_providers')->where('adapter', AiRuntimeSettings::SLOTS[$slot]['provider'])->where('is_default', true)->where('status', '!=', 'Disabled')->exists(), 422, 'Provider is disabled.');
        $code = $this->probe($slot, $secret, ['ref' => 'credential:env:'.$slot, 'limit' => null]);
        if ($code === 'TEST_PENDING') return $code;
        if ($code === 'OPERATION_VERIFIED') Cache::forget('pm:ai-credential-backoff:'.hash('sha256', 'credential:env:'.$slot));
        Cache::put($this->environmentCacheKey($slot), ['health_code' => $code, 'checked_at' => now()->toIso8601String()], now()->addMinutes(15));
        $access->audit($actor, 'credential.test', 'ai_workspace_credentials', 0, null, ['slot' => $slot, 'code' => $code], 'Environment credential '.$slot.': '.$code);
        return $code;
    }

    public function save(#[\SensitiveParameter] array $data, ?int $id, int $actor, AiAdminAccess $access, bool $verified = false): void
    {
        DB::transaction(function () use ($data, $id, $actor, $access, $verified): void {
            $slot = DB::table('ai_workspace_slots')->where('slot', $data['slot'])->lockForUpdate()->first();
            $before = $id ? DB::table('ai_workspace_credentials')->where('id', $id)->lockForUpdate()->first() : null;
            if ($id && (! $before || $before->slot !== $data['slot'])) abort(404);
            if ($id && ! $data['enabled'] && ((int) $slot->credential_id === $id || DB::table('ai_workspace_feature_routes')->where('primary_credential_id', $id)->orWhere('backup_credential_id', $id)->exists())) {
                throw ValidationException::withMessages(['enabled' => 'Reassign all primary and backup routes before disabling this credential.']);
            }
            if (DB::table('ai_workspace_credentials')->where('slot', $data['slot'])->where('name', $data['name'])->when($id, fn ($query) => $query->where('id', '!=', $id))->exists()) {
                throw ValidationException::withMessages(['name' => 'This credential name already exists in the pool.']);
            }
            $adapter = AiRuntimeSettings::SLOTS[$data['slot']]['provider'];
            $profile = DB::table('ai_workspace_providers')->where('adapter', $adapter)
                ->when(isset($data['provider_id']) || $before, fn ($query) => $query->where('id', $data['provider_id'] ?? $before->provider_id), fn ($query) => $query->where('is_default', true))
                ->lockForUpdate()->first();
            if (! $profile || (! $before && $profile->status === 'Disabled') || ($before && (int) $before->provider_id !== (int) $profile->id)) {
                throw ValidationException::withMessages(['provider_id' => 'Select a compatible provider. Existing credential providers cannot be changed.']);
            }
            $values = ['name' => $data['name'], 'enabled' => $data['enabled'], 'provider_id' => $profile->id, 'updated_at' => now()];
            if (array_key_exists('pool_label', $data)) $values['pool_label'] = $data['pool_label'];
            if (array_key_exists('priority', $data)) $values['priority'] = $data['priority'];
            if (array_key_exists('daily_budget_usd', $data)) {
                $values['daily_budget_usd'] = $data['daily_budget_usd'];
            }
            if (! $id) {
                $values += ['slot' => $data['slot'], 'secret_encrypted' => Crypt::encryptString($data['secret']),
                    'suffix' => substr($data['secret'], -4), 'created_at' => now()];
                if ($verified) $values += ['health_code' => 'OPERATION_VERIFIED', 'checked_at' => now()];
                $id = DB::table('ai_workspace_credentials')->insertGetId($values);
            } else DB::table('ai_workspace_credentials')->where('id', $id)->update($values);
            $access->audit($actor, $verified ? 'credential.rotate' : ($before ? 'credential.update' : 'credential.add'), 'ai_workspace_credentials', $id, null,
                ['slot' => $data['slot'], 'pool_label' => $values['pool_label'] ?? $before?->pool_label, 'provider_id' => $profile->id, 'enabled' => $data['enabled'], 'priority' => $values['priority'] ?? $before?->priority ?? 1, 'daily_budget_usd' => array_key_exists('daily_budget_usd', $values) ? $values['daily_budget_usd'] : $before?->daily_budget_usd], $verified ? 'Replacement operation verified; saved as standby; secret omitted' : 'Credential metadata saved; secret omitted');
        }, 3);
        app(AiRuntimeSettings::class)->forget();
    }

    public function test(int $id, int $actor, AiAdminAccess $access): string
    {
        $row = DB::table('ai_workspace_credentials')->where('id', $id)->first();
        abort_unless($row && $row->enabled && DB::table('ai_workspace_providers')->where('id', $row->provider_id)->where('status', '!=', 'Disabled')->exists(), 422, 'Select an enabled credential on a non-disabled provider.');
        $code = $this->probe($row->slot, Crypt::decryptString($row->secret_encrypted), $this->account($row));
        if ($code === 'TEST_PENDING') return $code;
        if ($code === 'OPERATION_VERIFIED') Cache::forget('pm:ai-credential-backoff:'.hash('sha256', 'credential:'.$id));
        DB::transaction(function () use ($row, $code, $actor, $access): void {
            abort_unless(DB::table('ai_workspace_credentials')->where('id', $row->id)->where('revision', $row->revision)
                ->update(['health_code' => $code, 'checked_at' => now()]), 409, 'Credential changed; test again.');
            $access->audit($actor, 'credential.test', 'ai_workspace_credentials', $row->id, null, ['code' => $code], 'Credential diagnostic: '.$code);
        });
        return $code;
    }

    private function account(object $row): array
    {
        return ['ref' => 'credential:'.$row->id, 'limit' => $row->daily_budget_usd === null ? null : (float) $row->daily_budget_usd];
    }

    public function rotate(int $id, #[\SensitiveParameter] string $secret, int $actor, AiAdminAccess $access): void
    {
        $row = DB::table('ai_workspace_credentials')->where('id', $id)->first();
        abort_unless($row, 404);
        abort_unless(DB::table('ai_workspace_providers')->where('id', $row->provider_id)->where('status', '!=', 'Disabled')->exists(), 422, 'Provider is disabled.');
        $code = $this->probe($row->slot, $secret, $this->account($row));
        if ($code !== 'OPERATION_VERIFIED') throw ValidationException::withMessages(['secret' => 'Replacement not activated: '.AiCredentialDiagnostic::message($code)]);
        DB::transaction(function () use ($row, $secret, $actor, $access): void {
            DB::table('ai_workspace_slots')->where('slot', $row->slot)->lockForUpdate()->first();
            abort_unless(DB::table('ai_workspace_credentials')->where('id', $row->id)->where('revision', $row->revision)->update([
                'secret_encrypted' => Crypt::encryptString($secret), 'suffix' => substr($secret, -4), 'revision' => $row->revision + 1,
                'health_code' => 'OPERATION_VERIFIED', 'checked_at' => now(), 'updated_at' => now(),
            ]), 409, 'Credential changed; reload before rotating.');
            $access->audit($actor, 'credential.rotate', 'ai_workspace_credentials', $row->id, null, null, 'Replacement operation verified; secret omitted');
        }, 3);
        Cache::forget('pm:ai-credential-backoff:'.hash('sha256', 'credential:'.$id));
        app(AiRuntimeSettings::class)->forget();
    }

    public function activate(string $slot, ?int $id, int $actor, AiAdminAccess $access): void
    {
        DB::transaction(function () use ($slot, $id, $actor, $access): void {
            DB::table('ai_workspace_slots')->where('slot', $slot)->lockForUpdate()->first();
            if ($id) {
                $row = DB::table('ai_workspace_credentials')->where('id', $id)->where('slot', $slot)->lockForUpdate()->first();
                abort_unless($row && DB::table('ai_workspace_providers')->where('id', $row->provider_id)->where('status', 'Active')->lockForUpdate()->first() && $row->enabled && $row->health_code === 'OPERATION_VERIFIED' && $row->checked_at
                    && \Illuminate\Support\Carbon::parse($row->checked_at)->gt(now()->subMinutes(15)), 422, 'Test this compatible credential successfully within 15 minutes before activating.');
            } else abort_unless(filled(config('pm-ai.'.$slot)), 422, 'No environment credential is configured.');
            DB::table('ai_workspace_slots')->where('slot', $slot)->update(['credential_id' => $id]);
            $access->audit($actor, 'credential.activate', 'ai_workspace_credentials', $id ?? 0, null, ['slot' => $slot], 'Active credential changed for '.$slot);
        }, 3);
        app(AiRuntimeSettings::class)->forget();
    }
}
