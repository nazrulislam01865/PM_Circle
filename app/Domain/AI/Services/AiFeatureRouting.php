<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Operation-level routing. Defaults preserve all existing feature settings. */
final class AiFeatureRouting
{
    private array $routes = [];

    public static function codes(): array
    {
        return [...array_keys(AiFeatureCatalog::FEATURES), 'feed_moderation', 'resume_extract'];
    }

    public static function slot(string $feature, string $provider = 'openai'): string
    {
        return match (true) {
            $feature === 'feed_moderation' => 'post_check_api_key',
            $feature === 'resume_extract' => 'resume_extract_api_key',
            in_array($feature, ['scenario_generate', 'daily_challenge_review'], true) => 'daily_challenge_api_key',
            $provider === 'gemini' => 'gemini_api_key',
            $provider === 'anthropic' => 'anthropic_api_key',
            default => 'api_key',
        };
    }

    public function route(string $feature): ?object
    {
        if (! array_key_exists($feature, $this->routes)) {
            $this->routes[$feature] = DB::table('ai_workspace_feature_routes')->where('feature_code', $feature)->first();
        }
        return $this->routes[$feature];
    }

    public function forget(): void { $this->routes = []; }

    /** Resolve the explicit primary without replacing any other operation's key. */
    public function selectPrimary(string $feature, string $slot): bool
    {
        $runtime = app(AiRuntimeSettings::class);
        $runtime->clearCredentialSelection($slot);
        $primary = $this->route($feature)?->primary_credential_id;
        return $primary === null ? filled($runtime->credential($slot)) : $runtime->selectCredential($slot, (int) $primary);
    }

    public function primaryConfigured(string $feature, string $slot): bool
    {
        try { return $this->selectPrimary($feature, $slot); }
        finally { app(AiRuntimeSettings::class)->clearCredentialSelection($slot); }
    }

    public function configured(string $feature, string $slot): bool
    {
        if ($this->primaryConfigured($feature, $slot)) return true;
        $route = $this->route($feature);
        if ($route?->strategy !== 'priority_failover' || ! $route->backup_credential_id) return false;
        return DB::table('ai_workspace_credentials as c')->join('ai_workspace_providers as p', 'p.id', '=', 'c.provider_id')->where('c.id', $route->backup_credential_id)->where('c.enabled', true)->where('p.status', 'Active')->exists();
    }

    public function primaryName(string $feature, string $slot): ?string
    {
        try { return $this->selectPrimary($feature, $slot) ? app(AiRuntimeSettings::class)->credentialName($slot) : null; }
        finally { app(AiRuntimeSettings::class)->clearCredentialSelection($slot); }
    }

    public function primarySecret(string $feature, string $slot): ?string
    {
        try { return $this->selectPrimary($feature, $slot) ? app(AiRuntimeSettings::class)->credential($slot) : null; }
        finally { app(AiRuntimeSettings::class)->clearCredentialSelection($slot); }
    }

    public function primaryAccounting(string $feature, string $slot): ?array
    {
        try { return $this->selectPrimary($feature, $slot) ? app(AiRuntimeSettings::class)->credentialAccounting($slot) : null; }
        finally { app(AiRuntimeSettings::class)->clearCredentialSelection($slot); }
    }

    /** Yield one credential at a time; no secret is retained in a routing snapshot. */
    public function directCandidates(string $feature, string $slot): \Generator
    {
        $runtime = app(AiRuntimeSettings::class);
        $route = $this->route($feature);
        $ids = [$route?->primary_credential_id];
        if ($route?->strategy === 'priority_failover' && $route->backup_credential_id) $ids[] = $route->backup_credential_id;
        $seen = [];
        foreach ($ids as $id) {
            $runtime->clearCredentialSelection($slot);
            try {
                if ($id !== null && ! $runtime->selectCredential($slot, (int) $id)) continue;
                $key = $runtime->credential($slot); $account = $runtime->credentialAccounting($slot);
                if (! $key || ! $account || isset($seen[$account['ref']])) continue;
                $seen[$account['ref']] = true;
                yield ['key' => $key, 'account' => $account];
            } finally { $runtime->clearCredentialSelection($slot); }
        }
    }

    public static function price(string $model): ?array
    {
        $row = DB::table('ai_model_prices')->where('model', $model)->where('effective_from', '<=', now())->orderByDesc('effective_from')->first();
        return $row ? ['input' => (string) $row->input_usd_per_m, 'cached' => (string) $row->cached_input_usd_per_m, 'output' => (string) $row->output_usd_per_m, 'price_id' => (int) $row->id] : null;
    }

    /** Snapshot routing and prices before dispatch. No secrets are stored in the snapshot. */
    public function snapshot(int $requestId, string $feature, array $prices): array
    {
        $route = $this->route($feature);
        if (! $route || (! $route->primary_credential_id && ! $route->backup_credential_id)) return $prices;
        $request = DB::table('ai_requests')->where('id', $requestId)->first(['model', 'provider', 'subject_type']);
        $primary = ['id' => $route->primary_credential_id ? (int) $route->primary_credential_id : null, 'slot' => self::slot($feature, $request->provider), 'model' => $request->model, 'provider' => $request->provider, 'price' => $prices];
        $candidates = [$primary];
        if ($route->strategy === 'priority_failover' && $route->backup_credential_id && ! in_array($request->subject_type, ['feature_connection_test', 'trend_connection_test'], true)) {
            $backup = DB::table('ai_workspace_credentials as c')->join('ai_workspace_providers as p', 'p.id', '=', 'c.provider_id')->where('c.id', $route->backup_credential_id)->first(['c.slot', 'p.adapter']);
            if ($backup) {
                $model = $route->backup_model ?: $request->model;
                $price = $model === $request->model ? $prices : self::price($model);
                // Disabled or incompatible backups cannot change the original request's safety policy.
                if ($price && $backup->slot === self::slot($feature, $backup->adapter) && $this->compatible($feature, $backup->adapter, $model)) {
                    $candidates[] = ['id' => (int) $route->backup_credential_id, 'slot' => $backup->slot, 'model' => $model, 'provider' => $backup->adapter, 'price' => $price];
                    foreach (['input', 'output', 'cached'] as $key) $prices[$key] = max((float) $prices[$key], (float) $price[$key]);
                }
            }
        }
        DB::table('ai_requests')->where('id', $requestId)->update(['routing_snapshot' => json_encode($candidates, JSON_THROW_ON_ERROR)]);
        return $prices;
    }

    public function compatible(string $feature, string $adapter, string $model): bool
    {
        if (in_array($feature, ['scenario_generate', 'daily_challenge_review'], true)) return $adapter === 'openai' && $model === 'gpt-5-nano';
        if ($feature === 'feed_moderation') return $adapter === 'openai' && $model === PostContentCheckService::selectedModel();
        if ($feature === 'resume_extract' && $adapter !== 'openai') return false;
        if (! in_array($model, app(AiRuntimeSettings::class)->allowedModels(), true)) return false;
        return match ($adapter) {
            'openai' => (bool) preg_match('/^(?:gpt-|o[1-9])/', $model),
            'gemini' => $feature === 'trend_draft' && str_starts_with($model, 'gemini-'),
            'anthropic' => in_array($feature, ['pmp_explain','pmp_followup','scenario_review','scenario_comment_review','ask_ai','trend_draft'], true) && str_starts_with($model, 'claude-'),
            default => false,
        };
    }

    public function save(string $feature, array $data, int $actor, AiAdminAccess $access): void
    {
        DB::transaction(function () use ($feature, $data, $actor, $access): void {
            $row = DB::table('ai_features')->where('code', $feature)->lockForUpdate()->first();
            $provider = $feature === 'trend_draft' ? app(\App\Domain\Careers\Services\CareerTrendSettings::class)->get()['ai_provider'] : 'openai';
            $model = match ($feature) {
                'feed_moderation' => PostContentCheckService::selectedModel(),
                'resume_extract' => $data['primary_model'] ?? app(ResumeExtractionSettings::class)->model(),
                default => $feature === 'trend_draft' && $provider === 'gemini' ? config('pm-ai.gemini_trend_model') : ($data['primary_model'] ?? $row?->model),
            };
            if (! is_string($model) || ! $this->compatible($feature, $provider, $model)) throw ValidationException::withMessages(['primary_model' => 'Choose a compatible approved primary model.']);
            if ((isset(AiFeatureCatalog::FEATURES[$feature]) || $feature === 'resume_extract') && ! self::price($model)) throw ValidationException::withMessages(['primary_model' => 'Publish the approved model price before assigning it.']);
            $slot = self::slot($feature, $provider);
            $primary = $data['primary_credential_id'] ?? null;
            $backup = $data['strategy'] === 'priority_failover' ? ($data['backup_credential_id'] ?? null) : null;
            $backupModel = $backup ? (($data['backup_model'] ?? null) ?: $model) : null;
            if ($feature === 'resume_extract' && $backup && $backupModel !== $model) throw ValidationException::withMessages(['backup_model' => 'Resume extraction failover must use the same model.']);
            if ($data['strategy'] === 'priority_failover' && ! $backup) throw ValidationException::withMessages(['backup_credential_id' => 'Select a distinct backup credential.']);
            $activeSlotId = DB::table('ai_workspace_slots')->where('slot', $slot)->value('credential_id');
            if ($backup && (int) ($primary ?? $activeSlotId) === (int) $backup) throw ValidationException::withMessages(['backup_credential_id' => 'Primary and backup credentials must be different.']);
            $ids = array_values(array_filter([$primary, $backup]));
            $keys = DB::table('ai_workspace_credentials as c')->join('ai_workspace_providers as p', 'p.id', '=', 'c.provider_id')->whereIn('c.id', $ids)->orderBy('c.id')->lockForUpdate()->get(['c.id', 'c.slot', 'c.enabled', 'c.health_code', 'p.adapter', 'p.status as provider_status'])->keyBy('id');
            foreach (['primary_credential_id' => $primary, 'backup_credential_id' => $backup] as $field => $id) {
                if (! $id) continue;
                $key = $keys->get($id);
                $candidateModel = $field === 'primary_credential_id' ? $model : $backupModel;
                if (! $key || ! $key->enabled || $key->provider_status !== 'Active' || $key->health_code !== 'OPERATION_VERIFIED' || $key->slot !== self::slot($feature, $key->adapter) || ! $this->compatible($feature, $key->adapter, $candidateModel) || ($field === 'primary_credential_id' && $key->slot !== $slot)) {
                    throw ValidationException::withMessages([$field => 'Choose a tested, enabled credential on a compatible active provider.']);
                }
            }
            if ($backup && (isset(AiFeatureCatalog::FEATURES[$feature]) || $feature === 'resume_extract') && ! self::price($backupModel)) throw ValidationException::withMessages(['backup_model' => 'The backup model requires an approved price.']);
            $values = ['primary_credential_id' => $primary, 'backup_credential_id' => $backup, 'backup_model' => $backupModel, 'strategy' => $data['strategy']];
            if (array_key_exists('daily_usd', $data)) $values['daily_usd'] = $data['daily_usd'];
            if ($feature === 'resume_extract') {
                $values['primary_model'] = $model;
                foreach (['enabled' => 'enabled_override', 'request_daily_limit' => 'request_daily_limit', 'output_token_limit' => 'output_token_limit'] as $input => $column) {
                    if (array_key_exists($input, $data)) $values[$column] = $data[$input];
                }
            }
            if (in_array($feature, ['resume_analyze', 'resume_rewrite'], true)) {
                if (! $row) throw ValidationException::withMessages(['primary_model' => 'Run the résumé AI migration first.']);
                $settings = [];
                foreach (['enabled' => 'enabled', 'request_daily_limit' => 'daily_limit', 'output_token_limit' => 'max_output_tokens', 'credit_tariff' => 'credit_tariff'] as $input => $column) {
                    if (array_key_exists($input, $data)) $settings[$column] = $data[$input];
                }
                if (($settings['enabled'] ?? $row->enabled) && ! DB::table('ai_prompt_versions')->where('feature_code', $feature)->where('version', $row->prompt_version)->whereNotNull('published_at')->exists()) {
                    throw ValidationException::withMessages(['enabled' => 'Publish the feature prompt first.']);
                }
                if (isset($settings['credit_tariff']) && (int) $settings['credit_tariff'] !== (int) $row->credit_tariff) $settings['tariff_version'] = $row->tariff_version + 1;
                if ($settings) DB::table('ai_features')->where('id', $row->id)->update([...$settings, 'updated_at' => now()]);
                $valuesForAudit = $settings;
            }
            DB::table('ai_workspace_feature_routes')->upsert([['feature_code' => $feature, ...$values, 'created_at' => now(), 'updated_at' => now()]], ['feature_code'], [...array_keys($values), 'updated_at']);
            if ($row && $provider === 'openai' && $row->model !== $model) DB::table('ai_features')->where('id', $row->id)->update(['model' => $model, 'updated_at' => now()]);
            $access->audit($actor, 'feature.route.update', 'ai_features', $row?->id ?? 0, null, [...$values, ...($valuesForAudit ?? [])], 'AI routing updated: '.$feature);
        }, 3);
        $this->forget();
    }
}
