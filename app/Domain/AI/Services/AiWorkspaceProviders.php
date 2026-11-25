<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class AiWorkspaceProviders
{
    public const ADAPTERS = ['openai' => 'OpenAI', 'gemini' => 'Google Gemini', 'anthropic' => 'Anthropic'];
    public const SUPPORTED = ['openai', 'gemini', 'anthropic'];

    public function rows(): array
    {
        return DB::table('ai_workspace_providers')->orderBy('id')->get(['id', 'name', 'adapter', 'status', 'is_default'])
            ->map(fn ($row) => [...(array) $row, 'is_default' => (bool) $row->is_default, 'supported' => in_array($row->adapter, self::SUPPORTED, true)])->all();
    }

    public function save(array $data, ?int $id, int $actor, AiAdminAccess $access): void
    {
        DB::transaction(function () use ($data, $id, $actor, $access): void {
            $before = $id ? DB::table('ai_workspace_providers')->where('id', $id)->lockForUpdate()->first() : null;
            if ($id) abort_unless($before, 404);
            if ($before && $before->adapter !== $data['adapter']) {
                throw ValidationException::withMessages(['adapter' => 'Provider adapters are immutable. Add another provider instead.']);
            }
            if ($data['status'] === 'Active' && ! in_array($data['adapter'], self::SUPPORTED, true)) {
                throw ValidationException::withMessages(['status' => 'This adapter is not implemented. Keep it on standby or disabled.']);
            }
            if ($before && $data['status'] !== 'Active' && (($before->is_default && $before->adapter !== 'anthropic') || DB::table('ai_workspace_slots as s')->join('ai_workspace_credentials as c', 'c.id', '=', 's.credential_id')->where('c.provider_id', $id)->exists() || DB::table('ai_workspace_feature_routes as r')->join('ai_workspace_credentials as c', fn ($join) => $join->on('c.id', '=', 'r.primary_credential_id')->orOn('c.id', '=', 'r.backup_credential_id'))->where('c.provider_id', $id)->exists())) {
                throw ValidationException::withMessages(['status' => 'Default providers must remain active. For other providers, reassign active credentials before changing status.']);
            }
            if ($id) DB::table('ai_workspace_providers')->where('id', $id)->update(['name' => $data['name'], 'status' => $data['status'], 'updated_at' => now()]);
            else $id = DB::table('ai_workspace_providers')->insertGetId([...$data, 'is_default' => false, 'created_at' => now(), 'updated_at' => now()]);
            $access->audit($actor, 'provider.configuration.save', 'ai_workspace_providers', $id, null, $data, 'Provider configuration saved');
        }, 3);
        app(AiRuntimeSettings::class)->forget();
    }
}
