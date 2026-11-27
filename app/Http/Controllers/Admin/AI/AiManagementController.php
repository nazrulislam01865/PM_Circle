<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiFeatureCatalog;
use App\Domain\AI\Support\AiFailure;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

final class AiManagementController extends Controller
{
    public function index(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.view_reports');
        $status = DB::table('ai_requests')->select('status')->selectRaw('COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays(7))->groupBy('status')->get();
        $cost = DB::table('ai_requests')->where('created_at', '>=', now()->subDays(30))
            ->whereNotNull('cost_usd')->sum('cost_usd');
        return response()->json([
            'enabled' => config('pm-ai.enabled'), 'purchases_enabled' => config('pm-ai.purchases_enabled'),
            'editorial_enabled' => config('pm-ai.editorial_enabled'),
            'requests_by_status_7_days' => $status, 'provider_cost_usd_30_days' => $cost,
            'pending_editorial' => DB::table('ai_editorial_drafts')->where('status', 'pending_review')->count(),
            'features' => DB::table('ai_features')->orderBy('code')->get([
                'id', 'code', 'enabled', 'min_plan', 'model', 'credit_tariff', 'tariff_version',
                'max_input_chars', 'max_output_tokens', 'prompt_version', 'daily_limit']),
        ]);
    }

    public function saveFeature(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate([
            'code' => ['required', Rule::in(array_keys(AiFeatureCatalog::FEATURES))],
            'enabled' => ['required', 'boolean'],
            'min_plan' => ['required', Rule::in(['free', 'plus', 'pro', 'staff'])],
            'model' => ['required', Rule::in(array_values(array_filter(app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), fn ($model) => preg_match('/^(?:gpt-|o[1-9])/', $model))))],
            'max_input_chars' => ['required', 'integer', 'between:100,20000'],
            'max_output_tokens' => ['required', 'integer', 'between:50,5000'],
            'credit_tariff' => ['required', 'integer', 'between:0,100000'],
            'prompt_version' => ['required', 'integer', 'min:1'],
            'daily_limit' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        $code = $data['code'];
        if ($data['min_plan'] === 'free' && $code !== 'daily_challenge_review') {
            abort(422, 'Only the free Daily Challenge evaluation feature permits this plan.');
        }
        if ($code === 'daily_challenge_review'
            && ($data['min_plan'] !== 'free' || $data['credit_tariff'] !== 0 || $data['model'] !== 'gpt-5-nano')) {
            abort(422, 'Daily Challenge AI review must remain free and use gpt-5-nano.');
        }
        if ($code === 'scenario_generate' && $data['model'] !== 'gpt-5-nano') {
            abort(422, 'Daily Challenge generation must use gpt-5-nano.');
        }
        if (in_array($code, ['scenario_generate', 'trend_draft'], true)
            && $data['min_plan'] !== 'staff') {
            abort(422, 'Editorial models must be staff-only.');
        }
        if ($data['enabled']) {
            $published = DB::table('ai_prompt_versions')->where('feature_code', $code)
                ->where('version', $data['prompt_version'])->whereNotNull('published_at')->exists();
            abort_unless($published, 422, 'A published prompt version is required.');
        }
        $actor = $request->user();
        DB::transaction(function () use ($data, $code, $actor, $access): void {
            $pmp = in_array($code, ['pmp_explain', 'pmp_followup'], true);
            $rows = $pmp ? DB::table('ai_features')->whereIn('code', ['pmp_explain', 'pmp_followup'])->orderBy('code')->lockForUpdate()->get()->keyBy('code') : null;
            $before = $pmp ? $rows->get($code) : DB::table('ai_features')->where('code', $code)->lockForUpdate()->first();
            if ($pmp && (($code === 'pmp_explain' && ! $data['enabled'] && $rows->get('pmp_followup')?->enabled)
                || ($code === 'pmp_followup' && $data['enabled'] && ! $rows->get('pmp_explain')?->enabled))) {
                abort(422, 'Enable question explanations before follow-up tutoring. Disable follow-up tutoring first.');
            }
            $old = $before ? (array) $before : null;
            $payload = collect($data)->except(['code', 'reason'])->all();
            $payload['tariff_version'] = $before
                ? ($before->credit_tariff === $data['credit_tariff'] ? $before->tariff_version : $before->tariff_version + 1)
                : 1;
            $payload['updated_at'] = now();
            if ($before) {
                DB::table('ai_features')->where('id', $before->id)->update($payload);
                $id = $before->id;
            } else {
                $id = DB::table('ai_features')->insertGetId([...$payload, 'code' => $code, 'created_at' => now()]);
            }
            $access->audit($actor->id, 'features.save', 'ai_features', $id,
                $old, $payload, $data['reason']);
        }, 3);
        return response()->json(['saved' => true]);
    }

    public function interviewPrompt(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_prompts');
        $prompt = DB::table('ai_features as f')->join('ai_prompt_versions as p', function ($join) {
            $join->on('p.feature_code', '=', 'f.code')->on('p.version', '=', 'f.prompt_version');
        })->where('f.code', 'interview_answer_review')->whereNotNull('p.published_at')
            ->first(['p.version', 'p.template', 'p.evaluation_reference']);
        abort_unless($prompt, 404, 'No active interview review prompt is configured.');
        return response()->json($prompt);
    }

    public function publishPrompt(Request $request, AiAdminAccess $access,
        AiFeatureCatalog $catalog): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_prompts');
        $data = $request->validate([
            'feature' => ['required', Rule::in(array_keys(AiFeatureCatalog::FEATURES))],
            'template' => ['required', 'string', 'min:30', 'max:12000'],
            'evaluation_reference' => ['required', 'string', 'min:5', 'max:160'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
            'activate' => ['sometimes', 'boolean'],
            'expected_version' => ['required_if:activate,true', 'integer', 'min:1'],
        ]);
        if (! empty($data['activate'])) {
            abort_unless($data['feature'] === 'interview_answer_review', 422);
            $access->authorize($request->user(), 'ai.manage_features');
        }
        $version = DB::transaction(function () use ($request, $data, $catalog, $access): int {
            // Serialize per-feature version creation with the feature row.
            $feature = DB::table('ai_features')->where('code', $data['feature'])->lockForUpdate()->first();
            abort_unless($feature, 404, 'Create the disabled feature record first.');
            if (! empty($data['activate']) && (int) $feature->prompt_version !== (int) $data['expected_version']) {
                abort(409, 'The active prompt changed. Reload it before publishing.');
            }
            $version = (int) DB::table('ai_prompt_versions')->where('feature_code', $data['feature'])
                ->max('version') + 1;
            $id = DB::table('ai_prompt_versions')->insertGetId([
                'feature_code' => $data['feature'], 'version' => $version,
                'template' => $data['template'], 'output_schema' => json_encode($catalog->schema($data['feature'])),
                'schema_version' => $data['feature'].'-v1',
                'evaluation_reference' => $data['evaluation_reference'],
                'approved_by' => $request->user()->id, 'published_at' => now(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'prompt.publish', 'ai_prompt_versions', $id,
                null, ['feature' => $data['feature'], 'version' => $version], $data['reason']);
            if (! empty($data['activate'])) {
                DB::table('ai_features')->where('id', $feature->id)->update(['prompt_version' => $version, 'updated_at' => now()]);
                $access->audit($request->user()->id, 'prompt.activate', 'ai_features', $feature->id,
                    ['prompt_version' => $feature->prompt_version], ['prompt_version' => $version], $data['reason']);
            }
            return $version;
        }, 3);
        return response()->json(['version' => $version], 201);
    }

    public function publishPrice(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_prices');
        $data = $request->validate([
            'model' => ['required', Rule::in(app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels())],
            'input_usd_per_m' => ['required', 'numeric', 'min:0', 'max:10000'],
            'cached_input_usd_per_m' => ['required', 'numeric', 'min:0', 'max:10000'],
            'output_usd_per_m' => ['required', 'numeric', 'min:0', 'max:10000'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        $id = DB::transaction(function () use ($data, $request, $access): int {
            $id = DB::table('ai_model_prices')->insertGetId([
                'model' => $data['model'], 'input_usd_per_m' => $data['input_usd_per_m'],
                'cached_input_usd_per_m' => $data['cached_input_usd_per_m'],
                'output_usd_per_m' => $data['output_usd_per_m'],
                'effective_from' => now(), 'approved_by' => $request->user()->id,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'pricing.publish', 'ai_model_prices', $id,
                null, ['model' => $data['model']], $data['reason']);
            return $id;
        });
        return response()->json(['id' => $id], 201);
    }

    public function usage(Request $request, AiAdminAccess $access): JsonResponse
    {
        $access->authorize($request->user(), 'ai.view_reports');
        $statuses = DB::table('ai_requests')->select(['feature_code', 'status'])
            ->selectRaw('COUNT(*) as requests')->selectRaw('SUM(final_charge) as credits')
            ->selectRaw('SUM(cost_usd) as cost_usd')
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('feature_code', 'status')->get();
        $failures = DB::table('ai_requests')->whereIn('status', ['failed', 'provider_status_unknown'])
            ->orderByDesc('id')->limit(50)
            ->get(['request_uuid', 'feature_code', 'status', 'error_code', 'created_at']);
        return response()->json(['usage' => $statuses, 'failures' => $failures]);
    }
}
