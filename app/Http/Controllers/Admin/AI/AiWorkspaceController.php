<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Services\AiFeatureRouting;
use App\Domain\AI\Services\AiRuntimeSettings;
use App\Domain\AI\Services\ResumeExtractionSettings;
use App\Domain\AI\Services\AiWorkspaceCredentials;
use App\Domain\AI\Services\AiWorkspaceProviders;
use App\Domain\AI\Services\OmniPostModerationService;
use App\Domain\AI\Services\PostContentCheckService;
use App\Domain\Careers\Services\CareerTrendSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

final class AiWorkspaceController extends Controller
{
    public const PAGES = ['overview', 'providers', 'keys', 'models', 'features', 'budget', 'usage', 'health', 'audit'];

    public function index(Request $request, string $section, AiAdminAccess $access, AiWorkspaceCredentials $credentials, AiRuntimeSettings $runtime)
    {
        $access->authorize($request->user(), 'ai.view_workspace');
        abort_unless(in_array($section, self::PAGES, true), 404);
        $data = ['section' => $section, 'initialProvider' => 'all'];
        $target = $request->query('slot');
        if ($section === 'keys' && is_string($target) && array_key_exists($target, AiRuntimeSettings::SLOTS)) $data['initialSlot'] = $target;
        if (in_array($section, ['overview', 'providers', 'keys', 'models', 'features', 'budget', 'usage'], true)) {
            $data['providerProfiles'] = app(AiWorkspaceProviders::class)->rows();
            $filter = $request->query('provider');
            if (is_string($filter)) {
                $profile = collect($data['providerProfiles'])->first(fn ($p) => (string) $p['id'] === $filter || ($p['is_default'] && $p['adapter'] === $filter));
                if ($profile) $data['initialProvider'] = $section === 'models' ? $profile['adapter'] : (string) $profile['id'];
            }
        }
        if (in_array($section, ['overview', 'providers', 'keys', 'features', 'health', 'budget', 'usage'], true)) {
            $data['credentials'] = $credentials->rows($data['providerProfiles'] ?? null);
            if (in_array($section, ['overview', 'keys', 'budget', 'usage'], true)) $data['credentials'] = $this->credentialUsage($data['credentials']);
        }
        if (in_array($section, ['overview', 'features', 'budget'], true)) {
            $data['features'] = $this->features();
        }
        if (in_array($section, ['providers', 'models', 'features'], true)) {
            $data['models'] = $this->models();
            if ($section === 'models') $data['canPrices'] = DB::table('ai_admin_permissions')->where('user_id', $request->user()->id)->where('permission', 'ai.manage_prices')->exists();
        }
        if (in_array($section, ['overview', 'budget', 'usage'], true)) {
            $data['usage'] = $this->usage();
            if ($section !== 'usage') $data['budgets'] = $this->budgets($runtime, $data['usage']);
        }
        if (in_array($section, ['overview', 'keys', 'features', 'budget'], true)) {
            $data['canBudget'] = DB::table('ai_admin_permissions')->where('user_id', $request->user()->id)->where('permission', 'ai.manage_quotas')->exists();
        }
        if ($section === 'audit') {
            $data['audit'] = DB::table('ai_audit_events as e')->leftJoin('users as u', 'u.id', '=', 'e.actor_id')
                ->orderByDesc('e.id')->select('e.id', 'e.action', 'e.subject_type', 'e.subject_id', 'e.reason', 'e.created_at', 'u.name as actor_name')->paginate(25);
        }
        if ($section === 'health') {
            $data['healthEvents'] = DB::table('ai_audit_events as e')->leftJoin('ai_workspace_credentials as c', 'c.id', '=', 'e.subject_id')
                ->where('e.subject_type', 'ai_workspace_credentials')->whereIn('e.action', ['credential.test', 'credential.rotate', 'credential.runtime.failure', 'credential.runtime.recovered'])
                ->orderByDesc('e.id')->limit(25)->get(['e.id', 'e.reason', 'e.created_at', 'c.name'])->map(function ($event) {
                    if ($event->name === null && preg_match('/^Environment credential ([a-z_]+):/', $event->reason, $match)) {
                        $event->name = AiRuntimeSettings::SLOTS[$match[1]]['name'] ?? 'Environment credential';
                    }
                    return $event;
                });
            $data['failures'] = DB::table('ai_requests')->whereIn('status', ['failed', 'provider_status_unknown'])->orderByDesc('id')->limit(25)
                ->get(['feature_code', 'provider', 'status', 'error_code', 'created_at']);
        }
        return Inertia::render('admin/AiWorkspace', $data);
    }

    private function features(): array
    {
        $rows = DB::table('ai_features')->get(['code', 'enabled', 'model', 'daily_limit', 'max_output_tokens', 'credit_tariff'])->keyBy('code');
        $trends = app(CareerTrendSettings::class)->get()['ai_provider'];
        $dailySettings = app(\App\Domain\DailyChallenge\Services\DailyChallengeSettings::class)->get();
        $result = [];
        foreach (AiFeatureCatalog::FEATURES as $code => $definition) {
            $row = $rows->get($code);
            $daily = in_array($code, ['scenario_generate', 'daily_challenge_review'], true);
            $slot = $daily ? 'daily_challenge_api_key' : ($code === 'trend_draft' && $trends === 'gemini' ? 'gemini_api_key' : 'api_key');
            $href = $daily ? '/admin/ai/daily-challenge' : (str_starts_with($code, 'pmp_') ? '/admin/ai/pmp-settings' : ($code === 'trend_draft' ? '/admin/ai/career-trends' : '/admin/ai/usage-management'));
            $result[] = ['code' => $code, 'name' => match ($code) {
                'scenario_generate' => 'Daily Challenge Generation', 'daily_challenge_review' => 'Daily Challenge Review',
                'resume_analyze' => 'AI Resume Assistant · Analysis', 'resume_rewrite' => 'AI Resume Assistant · Writing suggestions',
                'pmp_explain' => 'PMP Exam Explanation', 'pmp_followup' => 'PMP Exam Follow-up', 'trend_draft' => 'Career Trends',
                default => ucwords(str_replace('_', ' ', $code)),
            }, 'category' => ($daily || $definition['min_plan'] === 'staff') ? 'Editorial' : 'Interactive', 'slot' => $slot,
                'model' => $slot === 'gemini_api_key' ? config('pm-ai.gemini_trend_model') : $row?->model,
                'configured_enabled' => (bool) $row?->enabled, 'enabled' => (bool) config('pm-ai.enabled') && (bool) $row?->enabled && ($definition['min_plan'] !== 'staff' || (bool) config('pm-ai.editorial_enabled')) && (! $daily || (bool) $dailySettings->enabled) && ($code !== 'daily_challenge_review' || (bool) $dailySettings->auto_review),
                'daily_limit' => $code === 'daily_challenge_review' ? $dailySettings->max_reviews_per_user_daily : $row?->daily_limit, 'output_token_limit' => $row?->max_output_tokens, 'credit_tariff' => $row?->credit_tariff, 'href' => $href];
        }
        $result[] = ['code' => 'feed_moderation', 'name' => 'Feed Moderation', 'category' => 'Moderation', 'slot' => 'post_check_api_key',
            'model' => config('pm-ai.post_check_provider') === 'omni' ? OmniPostModerationService::MODEL : PostContentCheckService::MODEL,
            'enabled' => (bool) config('pm-ai.enabled') && (bool) config('pm-ai.post_check_enabled'), 'daily_limit' => null, 'href' => '/admin/ai/feed-moderation'];
        $resumeSettings = app(ResumeExtractionSettings::class);
        $result[] = ['code' => 'resume_extract', 'name' => 'AI Resume Assistant · Extraction', 'category' => 'Interactive', 'slot' => 'resume_extract_api_key',
            'model' => $resumeSettings->model(), 'enabled' => $resumeSettings->enabled(),
            'daily_limit' => $resumeSettings->dailyLimit(), 'output_token_limit' => $resumeSettings->outputLimit(), 'credit_tariff' => null, 'href' => null];
        $routes = DB::table('ai_workspace_feature_routes')->get()->keyBy('feature_code');
        return array_map(function ($feature) use ($routes) {
            $route = $routes->get($feature['code']);
            return [...$feature, 'primary_credential_id' => $route?->primary_credential_id, 'backup_credential_id' => $route?->backup_credential_id, 'backup_model' => $route?->backup_model, 'strategy' => $route?->strategy ?? 'primary_only', 'daily_usd' => $route?->daily_usd === null ? null : (float) $route->daily_usd, 'supports_failover' => true];
        }, $result);
    }

    private function models(): array
    {
        $environment = array_values(array_unique(array_filter([...config('pm-ai.allowed_models', []), OmniPostModerationService::MODEL, config('pm-ai.gemini_trend_model'), config('pm-ai.resume_extract_model')])));
        $registry = DB::table('ai_workspace_models')->orderBy('code')->get(['id', 'code', 'name', 'enabled', 'availability', 'capability'])->keyBy('code');
        $models = array_values(array_unique([...$environment, ...$registry->keys()->all()]));
        $prices = DB::table('ai_model_prices')->whereIn('model', $models)->where('effective_from', '<=', now())
            ->selectRaw('model, MAX(effective_from) as effective_from')->groupBy('model');
        $priced = DB::table('ai_model_prices as p')->joinSub($prices, 'latest', fn ($join) => $join->on('p.model', '=', 'latest.model')->on('p.effective_from', '=', 'latest.effective_from'))
            ->get(['p.model', 'p.input_usd_per_m', 'p.cached_input_usd_per_m', 'p.output_usd_per_m'])->keyBy('model');
        return array_map(function ($model) use ($environment, $registry, $priced) {
            $row = $registry->get($model);
            $fixed = in_array($model, $environment, true);
            $enabled = $fixed || (bool) $row?->enabled;
            return ['id' => $row?->id, 'code' => $model, 'name' => $row?->name ?? $model,
                'provider' => str_starts_with($model, 'gemini-') ? 'gemini' : (str_starts_with($model, 'claude-') ? 'anthropic' : 'openai'),
                'capability' => $row?->capability ?? ($model === OmniPostModerationService::MODEL ? 'Moderation' : 'Text generation'),
                'enabled' => $enabled, 'fixed' => $fixed, 'price' => $priced->get($model),
                'status' => $fixed ? 'Active' : ($row?->availability ?? 'Disabled')];
        }, $models);
    }

    public function saveModel(Request $request, AiAdminAccess $access, ?int $id = null)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate(['name' => ['required','string','max:100'], 'code' => ['required','string','max:80', 'regex:/^(?:omni-moderation-latest|gpt-[A-Za-z0-9.-]+|gemini-[A-Za-z0-9.-]+|claude-[A-Za-z0-9.-]+|text-embedding-[A-Za-z0-9.-]+|o[1-9][0-9]*(?:-[A-Za-z0-9.-]+)?)$/D', Rule::unique('ai_workspace_models','code')->ignore($id)], 'enabled' => ['required','boolean'], 'availability' => ['sometimes', Rule::in(['Active','Standby','Disabled'])], 'provider' => ['sometimes', Rule::in(AiWorkspaceProviders::SUPPORTED)], 'capability' => ['sometimes', Rule::in(['Text generation', 'Moderation', 'Embeddings', 'Vision'])]]);
        $adapter = str_starts_with($data['code'], 'gemini-') ? 'gemini' : (str_starts_with($data['code'], 'claude-') ? 'anthropic' : 'openai');
        abort_if(isset($data['provider']) && $data['provider'] !== $adapter, 422, 'Model identifier must match the selected provider.');
        $cap = $data['capability'] ?? ($data['code'] === OmniPostModerationService::MODEL ? 'Moderation' : 'Text generation');
        $embedding = str_contains($data['code'], 'embedding');
        abort_if(($cap === 'Moderation') !== ($data['code'] === OmniPostModerationService::MODEL) || ($cap === 'Embeddings') !== $embedding, 422, 'Model identifier must match the selected capability.');
        $data['capability'] = $cap;
        $data['availability'] ??= $data['enabled'] ? 'Active' : 'Disabled';
        $data['enabled'] = $data['availability'] === 'Active';
        unset($data['provider']);
        DB::transaction(function () use ($data, $id, $request, $access) {
            $before = $id ? DB::table('ai_workspace_models')->where('id', $id)->lockForUpdate()->first() : null;
            if ($id) abort_unless($before && $before->code === $data['code'], 422, 'Model identifiers are immutable. Register a new identifier instead.');
            abort_if(! $data['enabled'] && in_array($data['code'], [...config('pm-ai.allowed_models', []), OmniPostModerationService::MODEL, config('pm-ai.gemini_trend_model')], true), 422, 'This model is managed by the server allowlist and must remain active.');
            if (! $data['enabled']) {
                abort_if(DB::table('ai_features')->where('model', $data['code'])->where('enabled', true)->exists()
                    || DB::table('ai_workspace_feature_routes')->where(fn ($q) => $q->where('backup_model', $data['code'])->orWhere('primary_model', $data['code']))->exists()
                    || in_array($data['code'], [config('pm-ai.gemini_trend_model'), config('pm-ai.resume_extract_model'), PostContentCheckService::MODEL], true), 422, 'Reassign the configured feature before disabling this model.');
            }
            if ($id) DB::table('ai_workspace_models')->where('id', $id)->update(['name' => $data['name'], 'enabled' => $data['enabled'], 'availability' => $data['availability'], 'capability' => $data['capability'], 'updated_at' => now()]);
            else $id = DB::table('ai_workspace_models')->insertGetId([...$data, 'created_at' => now(), 'updated_at' => now()]);
            $access->audit($request->user()->id, 'model.registry.save', 'ai_workspace_models', $id, null, $data, 'Approved model registry metadata saved');
        }, 3);
        app(AiRuntimeSettings::class)->forget();
        return response()->json(['message' => 'Model saved. Paid gateway use requires an approved model price.']);
    }

    /** Aggregate only the seven-day window; no private prompts or unbounded request rows. */
    private function usage(): array
    {
        $start = now('UTC')->startOfDay()->subDays(6);
        $end = now('UTC')->startOfDay()->addDay();
        $gateway = DB::table('ai_requests')->where('created_at', '>=', $start)->where('created_at', '<', $end)
            ->selectRaw('DATE(created_at) as day, feature_code, provider, COUNT(*) as requests, COALESCE(SUM(input_tokens),0) as input_tokens, COALESCE(SUM(output_tokens),0) as output_tokens, COALESCE(SUM(cost_usd),0) as cost')
            ->groupByRaw('DATE(created_at), feature_code, provider')->get();
        $moderation = collect();
        foreach (['post_check_runs', 'comment_check_runs'] as $table) {
            $moderation = $moderation->concat(DB::table($table)->where('workspace_accounted', false)->where('created_at', '>=', $start)->where('created_at', '<', $end)
                ->selectRaw('DATE(created_at) as day, COUNT(*) as requests, COALESCE(SUM(input_tokens),0) as input_tokens, COALESCE(SUM(output_tokens),0) as output_tokens, COALESCE(SUM(cost_usd),0) as cost')
                ->selectRaw("SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running")->groupByRaw('DATE(created_at)')->get()->map(fn ($row) => (object) [...(array) $row, 'feature_code' => 'feed_moderation', 'provider' => 'openai']));
        }
        $rows = $gateway->concat($moderation);
        $today = $rows->where('day', now('UTC')->toDateString());
        $days = collect(range(0, 6))->map(function ($offset) use ($start, $rows) {
            $date = $start->copy()->addDays($offset);
            $group = $rows->where('day', $date->toDateString());
            $editorial = $group->whereIn('feature_code', ['scenario_generate', 'daily_challenge_review', 'trend_draft', 'feed_moderation'])->sum('requests');
            return ['day' => $date->format('D'), 'interactive' => $group->sum('requests') - $editorial, 'editorial' => $editorial];
        });
        return ['today' => ['requests' => $today->sum('requests'), 'input_tokens' => $today->sum('input_tokens'), 'output_tokens' => $today->sum('output_tokens'), 'cost' => $today->sum('cost')],
            'moderation_spent' => $today->where('feature_code', 'feed_moderation')->sum('cost'),
            'moderation_reserved' => config('pm-ai.post_check_provider') === 'responses' ? $today->where('feature_code', 'feed_moderation')->sum('running') * 0.02 : 0,
            'days' => $days, 'breakdown' => $today->groupBy(fn ($row) => $row->provider.'|'.$row->feature_code)->map(fn ($group) => [
                'provider' => $group->first()->provider, 'feature' => $group->first()->feature_code, 'requests' => $group->sum('requests'), 'cost' => $group->sum('cost'),
            ])->values()];
    }

    /** Daily recorded spend by actual credential; older unassigned ledger rows are never guessed. */
    private function credentialUsage(array $credentials): array
    {
        $day = now('UTC')->toDateString();
        $buckets = DB::table('ai_budget_usage')->where('utc_day', $day)->where('scope', 'like', 'credential:%')
            ->get(['scope', 'spent_usd', 'reserved_usd'])->keyBy('scope');
        return array_map(function ($row) use ($buckets) {
            $bucket = $buckets->get('credential:'.$row['id']);
            return [...$row, 'spent' => (float) ($bucket?->spent_usd ?? 0), 'reserved' => (float) ($bucket?->reserved_usd ?? 0)];
        }, $credentials);
    }

    private function budgets(AiRuntimeSettings $runtime, array $usage): array
    {
        $day = now('UTC')->toDateString();
        $month = now('UTC')->startOfMonth()->toDateString();
        $buckets = DB::table('ai_budget_usage')->where(function ($query) use ($day, $month) {
            $query->where('utc_day', $day)->orWhere(fn ($q) => $q->where('utc_day', $month)->where('scope', 'global-month'));
        })->whereIn('scope', ['global','global-month','editorial','moderation', ...array_map(fn ($code) => 'feature:'.$code, AiFeatureRouting::codes())])->get()->keyBy('scope');
        $result = collect(AiRuntimeSettings::LIMITS)->map(function ($label, $scope) use ($runtime, $buckets, $usage) {
            $row = $buckets->get(match ($scope) { 'global_daily_budget_usd' => 'global', 'global_monthly_budget_usd' => 'global-month', 'post_check_daily_budget_usd' => 'moderation', default => 'editorial' });
            return ['label' => $label, 'limit' => $scope === 'global_monthly_budget_usd' ? $runtime->monthlyBudget() : $runtime->budget($scope), 'spent' => (float) ($row?->spent_usd ?? 0), 'reserved' => (float) ($row?->reserved_usd ?? 0)];
        })->all();
        foreach (DB::table('ai_workspace_feature_routes')->get(['feature_code','daily_usd']) as $route) {
            $row = $buckets->get('feature:'.$route->feature_code);
            $result['feature:'.$route->feature_code] = ['label' => $route->feature_code, 'limit' => $route->daily_usd === null ? null : (float) $route->daily_usd, 'spent' => (float) ($row?->spent_usd ?? 0), 'reserved' => (float) ($row?->reserved_usd ?? 0)];
        }
        return $result;
    }

    /** Connection dialogs edit the same workspace route, not a second settings record. */
    public function connectionOptions(Request $request, string $feature, AiAdminAccess $access, AiWorkspaceCredentials $credentials, AiFeatureRouting $routing)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $operation = $this->connectionOperation($feature);
        $slot = $operation['slot'];
        $selected = $operation['primary_credential_id'];
        $profiles = app(AiWorkspaceProviders::class)->rows();
        $rows = collect($credentials->rows($profiles, $slot));
        $default = $rows->first(fn ($row) => $row['slot_active']);
        $options = $rows->filter(fn ($row) => $row['source'] === 'registry' && $row['enabled'] && $row['provider_status'] === 'Active')
            ->map(fn ($row) => [
                'id' => $row['id'], 'name' => $row['name'], 'provider' => $row['provider_name'], 'provider_id' => (string) $row['provider_id'],
                'suffix' => $row['suffix'], 'health_code' => $row['health_code'], 'checked_at' => $row['checked_at'],
                'eligible' => $row['health_code'] === 'OPERATION_VERIFIED' && $row['checked_at'] && \Illuminate\Support\Carbon::parse($row['checked_at'])->gt(now()->subMinutes(15)),
            ])->values()->all();
        return response()->json([
            'feature' => $feature, 'model' => $operation['model'], 'slot' => $slot,
            'models' => $this->connectionModels($feature, $slot, $operation['model'], $routing),
            'selected' => $selected === null ? 'default' : (string) $selected,
            'default_name' => $default['name'] ?? null, 'credential_name' => $routing->primaryName($feature, $slot),
            'credentials' => $options,
            'providers' => array_values(array_map(fn ($profile) => ['value' => (string) $profile['id'], 'label' => $profile['name']], array_filter($profiles, fn ($profile) => $profile['adapter'] === AiRuntimeSettings::SLOTS[$slot]['provider'] && $profile['status'] === 'Active'))),
        ])->header('Cache-Control', 'no-store');
    }

    public function saveConnectionPrimary(Request $request, string $feature, AiAdminAccess $access, AiFeatureRouting $routing)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate(['credential_id' => ['present','nullable','integer','min:1'], 'expected' => ['required','string','max:30'], 'primary_model' => ['required','string','max:80'], 'expected_model' => ['present','nullable','string','max:80']]);
        DB::transaction(function () use ($feature, $data, $request, $access, $routing): void {
            // Serialize with the existing workspace writer for catalog operations.
            $catalog = DB::table('ai_features')->where('code', $feature)->lockForUpdate()->first();
            abort_unless($catalog || $feature === 'feed_moderation', 422, 'Initialize the existing feature catalog first.');
            $route = DB::table('ai_workspace_feature_routes')->where('feature_code', $feature)->lockForUpdate()->first();
            $operation = $this->connectionOperation($feature);
            $current = $route?->primary_credential_id === null ? 'default' : (string) $route->primary_credential_id;
            abort_unless($current === $data['expected'] && $operation['model'] === $data['expected_model'], 409, 'The workspace assignment changed. Reopen the connection dialog.');
            abort_unless(in_array($data['primary_model'], $this->connectionModels($feature, $operation['slot'], $operation['model'], $routing), true), 422, 'Choose a compatible approved model with current pricing.');
            $id = $data['credential_id'];
            if ($id !== null && (string) $id !== $current) {
                $key = DB::table('ai_workspace_credentials')->where('id', $id)->lockForUpdate()->first();
                abort_unless($key && $key->health_code === 'OPERATION_VERIFIED' && $key->checked_at && \Illuminate\Support\Carbon::parse($key->checked_at)->gt(now()->subMinutes(15)), 422, 'Test this credential successfully in AI Workspace within 15 minutes before selecting it.');
            }
            $routing->save($feature, [
                'primary_model' => $data['primary_model'], 'primary_credential_id' => $id,
                'backup_credential_id' => $route?->backup_credential_id, 'backup_model' => $route?->backup_model,
                'strategy' => $route?->strategy ?? 'primary_only',
            ], $request->user()->id, $access);
        }, 3);
        return response()->json(['message' => 'Workspace connection saved. Test the saved feature connection.']);
    }

    private function connectionModels(string $feature, string $slot, ?string $current, AiFeatureRouting $routing): array
    {
        $adapter = AiRuntimeSettings::SLOTS[$slot]['provider'];
        if ($feature === 'feed_moderation') return $current ? [$current] : [];
        $models = $slot === 'gemini_api_key' ? array_filter([$current]) : app(AiRuntimeSettings::class)->allowedModels();
        $priced = DB::table('ai_model_prices')->whereIn('model', $models)->where('effective_from', '<=', now())->distinct()->pluck('model')->all();
        return array_values(array_filter($models, fn ($model) => in_array($model, $priced, true) && $routing->compatible($feature, $adapter, $model)));
    }

    private function connectionOperation(string $feature): array
    {
        abort_unless(in_array($feature, ['scenario_generate', 'daily_challenge_review', 'pmp_explain', 'pmp_followup', 'feed_moderation', 'trend_draft'], true), 404);
        $provider = $feature === 'trend_draft' ? app(CareerTrendSettings::class)->get()['ai_provider'] : 'openai';
        $model = match ($feature) {
            'feed_moderation' => match (config('pm-ai.post_check_provider')) { 'omni' => OmniPostModerationService::MODEL, 'responses' => PostContentCheckService::MODEL, default => null },
            'trend_draft' => $provider === 'gemini' ? config('pm-ai.gemini_trend_model') : DB::table('ai_features')->where('code', $feature)->value('model'),
            default => DB::table('ai_features')->where('code', $feature)->value('model'),
        };
        return ['slot' => AiFeatureRouting::slot($feature, $provider), 'model' => $model,
            'primary_credential_id' => DB::table('ai_workspace_feature_routes')->where('feature_code', $feature)->value('primary_credential_id')];
    }

    public function saveFeatureRoute(Request $request, string $feature, AiAdminAccess $access, AiFeatureRouting $routing)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        abort_unless(in_array($feature, AiFeatureRouting::codes(), true), 404);
        $data = $request->validate(['primary_model' => ['required','string','max:80'], 'primary_credential_id' => ['nullable','integer','min:1'], 'backup_credential_id' => ['nullable','integer','min:1'], 'backup_model' => ['nullable','string','max:80'], 'strategy' => ['required',Rule::in(['primary_only','priority_failover'])], 'daily_usd' => ['sometimes','nullable','numeric','min:0','max:100000']]);
        if (array_key_exists('daily_usd', $data)) $access->authorize($request->user(), 'ai.manage_quotas');
        if (in_array($feature, ['resume_extract', 'resume_analyze', 'resume_rewrite'], true)) {
            $extract = $feature === 'resume_extract';
            $data += $request->validate([
                'enabled' => ['sometimes', 'boolean'],
                'request_daily_limit' => ['sometimes', ...($extract ? ['required','integer','between:1,20'] : ['nullable','integer','between:0,10000'])],
                'output_token_limit' => ['sometimes', 'required', 'integer', $extract ? 'between:2000,10000' : 'between:50,5000'],
                'credit_tariff' => $extract ? ['prohibited'] : ['sometimes','required','integer','between:0,100000'],
            ]);
            if (array_key_exists('request_daily_limit', $data) || array_key_exists('credit_tariff', $data)) $access->authorize($request->user(), 'ai.manage_quotas');
        }
        $routing->save($feature, $data, $request->user()->id, $access);
        return response()->json(['message' => 'Feature routing saved.']);
    }

    public function saveProvider(Request $request, AiAdminAccess $access, AiWorkspaceProviders $providers, ?int $id = null)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('ai_workspace_providers', 'name')->ignore($id)],
            'adapter' => ['required', Rule::in(array_keys(AiWorkspaceProviders::ADAPTERS))],
            'status' => ['required', Rule::in(['Active', 'Standby', 'Disabled'])],
        ]);
        $providers->save($data, $id, $request->user()->id, $access);
        return response()->json(['message' => 'Provider saved.']);
    }

    public function saveKey(Request $request, AiAdminAccess $access, AiWorkspaceCredentials $credentials, ?int $id = null)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        abort_unless($request->expectsJson(), 406);
        $slot = $request->validate(['slot' => ['required', 'string', Rule::in(array_keys(AiRuntimeSettings::SLOTS))]])['slot'];
        $data = $request->validate(['slot' => ['required', Rule::in(array_keys(AiRuntimeSettings::SLOTS))],
            'name' => ['required','string','max:100', Rule::unique('ai_workspace_credentials','name')->where('slot', $slot)->ignore($id)],
            'pool_label' => ['sometimes','required','string','max:100'], 'import_environment' => [$id ? 'prohibited' : 'sometimes','boolean'],
            'provider_id' => ['nullable','integer','exists:ai_workspace_providers,id'], 'priority' => ['sometimes','integer','min:1','max:99'], 'daily_budget_usd' => ['sometimes','nullable','numeric','min:0','max:100000'], 'enabled' => ['required','boolean'], 'secret' => [$id || $request->boolean('import_environment') ? 'prohibited' : 'required','string','min:12','max:512','regex:/^[!-~]+$/D']]);
        if (array_key_exists('daily_budget_usd', $data)) $access->authorize($request->user(), 'ai.manage_quotas');
        $import = (bool) ($data['import_environment'] ?? false);
        unset($data['import_environment']);
        if ($import) {
            $secret = config('pm-ai.'.$slot);
            abort_unless(is_string($secret) && $secret !== '', 422, 'No environment credential is configured.');
            $data['secret'] = $secret;
        }
        $credentials->save($data, $id, $request->user()->id, $access);
        return response()->json(['message' => $import ? 'Managed copy saved. Test and activate it to replace the environment route.' : 'Credential saved.']);
    }

    public function rotateEnvironment(Request $request, string $slot, AiAdminAccess $access, AiWorkspaceCredentials $credentials)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        abort_unless($request->expectsJson(), 406);
        abort_unless(array_key_exists($slot, AiRuntimeSettings::SLOTS), 404);
        abort_unless(filled(config('pm-ai.'.$slot)), 422, 'No environment credential is configured.');
        abort_unless(DB::table('ai_workspace_providers')->where('adapter', AiRuntimeSettings::SLOTS[$slot]['provider'])->where('is_default', true)->where('status', '!=', 'Disabled')->exists(), 422, 'Provider is disabled.');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('ai_workspace_credentials', 'name')->where('slot', $slot)],
            'secret' => ['required','string','min:12','max:512','regex:/^[!-~]+$/D'],
        ]);
        $code = $credentials->probe($slot, $data['secret']);
        if ($code !== 'OPERATION_VERIFIED') throw \Illuminate\Validation\ValidationException::withMessages(['secret' => 'Replacement not saved: '.\App\Domain\AI\Services\AiCredentialDiagnostic::message($code)]);
        $credentials->save([...$data, 'slot' => $slot, 'enabled' => true], null, $request->user()->id, $access, verified: true);
        return response()->json(['message' => 'Replacement verified and saved as standby. Activate it to switch from the current credential.']);
    }

    public function testKey(Request $request, int $id, AiAdminAccess $access, AiWorkspaceCredentials $credentials)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $code = $credentials->test($id, $request->user()->id, $access);
        return response()->json(['code' => $code, 'message' => \App\Domain\AI\Services\AiCredentialDiagnostic::message($code)]);
    }

    public function testEnvironment(Request $request, string $slot, AiAdminAccess $access, AiWorkspaceCredentials $credentials)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        abort_unless(array_key_exists($slot, AiRuntimeSettings::SLOTS), 404);
        $code = $credentials->testEnvironment($slot, $request->user()->id, $access);
        return response()->json(['code' => $code, 'message' => \App\Domain\AI\Services\AiCredentialDiagnostic::message($code)]);
    }

    public function rotateKey(Request $request, int $id, AiAdminAccess $access, AiWorkspaceCredentials $credentials)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        abort_unless($request->expectsJson(), 406);
        $data = $request->validate(['secret' => ['required','string','min:12','max:512','regex:/^[!-~]+$/D']]);
        $credentials->rotate($id, $data['secret'], $request->user()->id, $access);
        return response()->json(['message' => 'Credential rotated.']);
    }

    public function activateKey(Request $request, AiAdminAccess $access, AiWorkspaceCredentials $credentials)
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate(['slot' => ['required', Rule::in(array_keys(AiRuntimeSettings::SLOTS))], 'id' => ['present','nullable','integer','min:1']]);
        $credentials->activate($data['slot'], $data['id'] === null ? null : (int) $data['id'], $request->user()->id, $access);
        return response()->json(['message' => 'Default credential activated. Explicit feature routes remain unchanged; review Feature Configuration.']);
    }

    public function saveBudget(Request $request, AiAdminAccess $access)
    {
        $access->authorize($request->user(), 'ai.manage_quotas');
        $data = $request->validate(['scope' => ['required', Rule::in(array_keys(AiRuntimeSettings::LIMITS))], 'daily_usd' => ['required','numeric','min:0','max:100000'], 'monthly_usd' => ['sometimes','nullable','numeric','min:0','max:10000000']]);
        DB::transaction(function () use ($data, $request, $access) {
            DB::table('ai_workspace_limits')->upsert([['scope' => $data['scope'], 'daily_usd' => $data['daily_usd']]], ['scope'], ['daily_usd']);
            if ($data['scope'] === 'global_daily_budget_usd' && array_key_exists('monthly_usd', $data)) {
                if ($data['monthly_usd'] === null) DB::table('ai_workspace_limits')->where('scope', 'global_monthly_budget_usd')->delete();
                else DB::table('ai_workspace_limits')->upsert([['scope' => 'global_monthly_budget_usd', 'daily_usd' => $data['monthly_usd']]], ['scope'], ['daily_usd']);
            }
            $access->audit($request->user()->id, 'budget.update', 'ai_workspace_limits', 0, null, $data, 'Daily budget updated: '.$data['scope'].' = '.$data['daily_usd'].' USD');
        });
        app(AiRuntimeSettings::class)->forget();
        return response()->json(['message' => 'Daily limit saved.']);
    }
}
