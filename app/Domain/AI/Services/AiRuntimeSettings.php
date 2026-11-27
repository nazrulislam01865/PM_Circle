<?php

namespace App\Domain\AI\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/** Scoped to the current HTTP request or queue job. Never share decrypted keys through Redis. */
final class AiRuntimeSettings
{
    public const SLOTS = [
        'api_key' => ['name' => 'OpenAI Primary', 'provider' => 'openai', 'pool' => 'Interactive / OpenAI trends'],
        'daily_challenge_api_key' => ['name' => 'Daily Challenge', 'provider' => 'openai', 'pool' => 'Editorial'],
        'post_check_api_key' => ['name' => 'Feed Moderation', 'provider' => 'openai', 'pool' => 'Moderation / safety'],
        'anthropic_api_key' => ['name' => 'Anthropic Primary', 'provider' => 'anthropic', 'pool' => 'Approved fallback'],
        'gemini_api_key' => ['name' => 'Gemini Primary', 'provider' => 'gemini', 'pool' => 'Career Trends'],
        'resume_extract_api_key' => ['name' => 'Resume Extraction', 'provider' => 'openai', 'pool' => 'Private resume extraction'],
    ];
    public const LIMITS = [
        'global_daily_budget_usd' => 'Global daily limit',
        'global_monthly_budget_usd' => 'Global monthly limit',
        'editorial_budget_usd' => 'Editorial gateway',
        'post_check_daily_budget_usd' => 'Responses moderation',
    ];

    private ?array $credentials = null;
    private ?array $limits = null;
    private ?array $registeredModels = null;
    private array $resolvedSecrets = [];
    private array $overrides = [];
    private array $explicitCredentials = [];

    public function credential(string $slot): ?string
    {
        if (! array_key_exists($slot, self::SLOTS)) {
            throw new \InvalidArgumentException('Unknown AI credential slot.');
        }
        if (isset($this->overrides[$slot])) return $this->overrides[$slot]['secret'];
        $this->credentials ??= DB::table('ai_workspace_slots as s')
            ->join('ai_workspace_credentials as c', 'c.id', '=', 's.credential_id')
            ->leftJoin('ai_workspace_providers as p', 'p.id', '=', 'c.provider_id')
            ->select('s.slot', 'c.name', 'c.secret_encrypted', 'c.enabled', 'c.id', 'c.daily_budget_usd', 'p.status as provider_status')->get()->keyBy('slot')->all();
        if (isset($this->credentials[$slot])) {
            $row = $this->credentials[$slot];
            // A disabled assigned credential fails closed; never silently fall back to an environment key.
            return $row->enabled && $row->provider_status === 'Active' ? ($this->resolvedSecrets[$slot] ??= Crypt::decryptString($row->secret_encrypted)) : null;
        }
        if ($slot === 'anthropic_api_key' && ! DB::table('ai_workspace_providers')->where('adapter', 'anthropic')->where('is_default', true)->where('status', 'Active')->exists()) return null;
        $key = config('pm-ai.'.$slot);
        return is_string($key) && $key !== '' ? $key : null;
    }

    public function hasAssignedCredential(string $slot): bool
    {
        $this->credential($slot);
        return isset($this->credentials[$slot]);
    }

    public function credentialName(string $slot): ?string
    {
        if (! $this->credential($slot)) return null;
        return $this->overrides[$slot]['name'] ?? $this->credentials[$slot]->name ?? self::SLOTS[$slot]['name'];
    }

    /** Stable accounting identity, never a secret or a secret-derived hash. */
    public function credentialAccounting(string $slot): ?array
    {
        if (! $this->credential($slot)) return null;
        if (isset($this->overrides[$slot])) return $this->overrides[$slot]['accounting'];
        $row = $this->credentials[$slot] ?? null;
        return ['ref' => $row ? 'credential:'.$row->id : 'credential:env:'.$slot,
            'limit' => $row?->daily_budget_usd === null ? null : (float) $row->daily_budget_usd];
    }

    /** A general OpenAI Responses key may be explicitly shared with Daily Challenge.
     *  Dedicated moderation/extraction slots remain isolated; defaults never cross slots.
     */
    public static function explicitCredentialSlots(string $slot): array
    {
        return $slot === 'daily_challenge_api_key' ? [$slot, 'api_key'] : [$slot];
    }

    /** Explicit per-operation selection, scoped to this worker invocation. */
    public function selectCredential(string $slot, int $id): bool
    {
        unset($this->overrides[$slot]);
        $cacheKey = $slot.':'.$id;
        if (! array_key_exists($cacheKey, $this->explicitCredentials)) {
            $row = DB::table('ai_workspace_credentials as c')->join('ai_workspace_providers as p', 'p.id', '=', 'c.provider_id')
            ->where('c.id', $id)->whereIn('c.slot', self::explicitCredentialSlots($slot))->where('c.enabled', true)->where('p.status', 'Active')
            ->where('p.adapter', self::SLOTS[$slot]['provider'])
            ->first(['c.id', 'c.name', 'c.secret_encrypted', 'c.daily_budget_usd']);
            $this->explicitCredentials[$cacheKey] = $row ? ['secret' => Crypt::decryptString($row->secret_encrypted), 'name' => $row->name,
            'accounting' => ['ref' => 'credential:'.$row->id, 'limit' => $row->daily_budget_usd === null ? null : (float) $row->daily_budget_usd]] : null;
        }
        if (! $this->explicitCredentials[$cacheKey]) return false;
        $this->overrides[$slot] = $this->explicitCredentials[$cacheKey];
        return true;
    }

    public function clearCredentialSelection(string $slot): void
    {
        unset($this->overrides[$slot]);
    }

    public function monthlyBudget(): ?float
    {
        $this->limits ??= DB::table('ai_workspace_limits')->pluck('daily_usd', 'scope')->all();
        $value = $this->limits['global_monthly_budget_usd'] ?? config('pm-ai.global_monthly_budget_usd');
        return $value === null ? null : (float) $value;
    }

    public function budget(string $scope): float
    {
        if (! array_key_exists($scope, self::LIMITS)) {
            throw new \InvalidArgumentException('Unknown AI budget scope.');
        }
        $this->limits ??= DB::table('ai_workspace_limits')->pluck('daily_usd', 'scope')->all();
        return (float) ($this->limits[$scope] ?? config('pm-ai.'.$scope, 0));
    }

    public function allowedModels(): array
    {
        $this->registeredModels ??= DB::table('ai_workspace_models')->where('enabled', true)->whereIn('capability', ['Text generation', 'Vision'])->pluck('code')->all();
        return array_values(array_unique([...config('pm-ai.allowed_models', []), ...array_filter([config('pm-ai.resume_extract_model'), config('pm-ai.gemini_trend_model')]), ...$this->registeredModels]));
    }

    public function forget(): void
    {
        $this->credentials = $this->limits = $this->registeredModels = null;
        $this->resolvedSecrets = [];
        $this->overrides = [];
        $this->explicitCredentials = [];
    }
}
