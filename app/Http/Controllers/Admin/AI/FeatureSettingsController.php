<?php

namespace App\Http\Controllers\Admin\AI;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\FeatureConnectionStatus;
use App\Domain\AI\Services\FeedModerationSettings;
use App\Domain\AI\Services\PostContentCheckService;
use App\Http\Controllers\Controller;
use App\Services\Exam\PmpExamSettings;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class FeatureSettingsController extends Controller
{
    private const PMP = ['pmp_explain', 'pmp_followup'];

    public function pmp(Request $request, AiAdminAccess $access, PmpExamSettings $exam, FeatureConnectionStatus $connection): Response
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $features = DB::table('ai_features')->whereIn('code', self::PMP)->get(['code', 'enabled', 'model', 'min_plan'])->keyBy('code');
        $models = array_values(array_filter(app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), fn ($model) => preg_match('/^(?:gpt-|o[1-9])/', $model)));
        return Inertia::render('admin/PmpAiSettings', [
            'features' => $features, 'exam' => $exam->get(), 'models' => $models,
            'connection' => $connection->status('pmp', $features->get('pmp_explain')?->model, (bool) $features->get('pmp_explain')?->enabled),
        ]);
    }

    public function updatePmp(Request $request, AiAdminAccess $access): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $models = array_values(array_filter(app(\App\Domain\AI\Services\AiRuntimeSettings::class)->allowedModels(), fn ($model) => preg_match('/^(?:gpt-|o[1-9])/', $model)));
        $data = $request->validate([
            'features' => ['required', 'array:pmp_explain,pmp_followup'],
            'features.pmp_explain' => ['required', 'array:enabled,model'],
            'features.pmp_followup' => ['required', 'array:enabled,model'],
            'features.*.enabled' => ['required', 'boolean'],
            'features.*.model' => ['required', Rule::in($models)],
        ]);
        if ($data['features']['pmp_followup']['enabled'] && ! $data['features']['pmp_explain']['enabled']) {
            throw ValidationException::withMessages(['features.pmp_followup.enabled' => 'Enable question explanations before follow-up tutoring.']);
        }
        DB::transaction(function () use ($data, $request, $access): void {
            $rows = DB::table('ai_features')->whereIn('code', self::PMP)->orderBy('code')->lockForUpdate()->get()->keyBy('code');
            foreach (self::PMP as $code) {
                $before = $rows->get($code);
                if (! $before) throw ValidationException::withMessages(['features' => 'Initialize the existing PMP AI features first.']);
                $values = $data['features'][$code];
                if ($values['enabled'] && (! DB::table('ai_prompt_versions')->where('feature_code', $code)->where('version', $before->prompt_version)->whereNotNull('published_at')->exists()
                    || ! DB::table('ai_model_prices')->where('model', $values['model'])->where('effective_from', '<=', now())->exists())) {
                    throw ValidationException::withMessages(["features.$code.model" => 'An approved prompt and current model price are required.']);
                }
                if ((bool) $before->enabled === (bool) $values['enabled'] && $before->model === $values['model']) continue;
                DB::table('ai_features')->where('id', $before->id)->update([...$values, 'updated_at' => now()]);
                $access->audit($request->user()->id, 'pmp_ai.settings.update', 'ai_features', $before->id,
                    ['enabled' => (bool) $before->enabled, 'model' => $before->model], $values, 'Administrator updated PMP tutor settings');
            }
        }, 3);
        return back();
    }

    public function feed(Request $request, AiAdminAccess $access, FeedModerationSettings $settings, FeatureConnectionStatus $connection): Response
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $model = $this->feedModel();
        return Inertia::render('admin/FeedModerationAiSettings', [
            'settings' => ['hold_clean_content' => $settings->holdCleanContent()],
            'enabled' => (bool) config('pm-ai.enabled') && (bool) config('pm-ai.post_check_enabled'),
            'provider' => config('pm-ai.post_check_provider'),
            'connection' => $connection->status('feed-moderation', $model),
        ]);
    }

    public function updateFeed(Request $request, AiAdminAccess $access): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_features');
        $data = $request->validate(['hold_clean_content' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $access, $data): void {
            $before = DB::table('feed_moderation_settings')->where('id', 1)->lockForUpdate()->firstOrFail();
            DB::table('feed_moderation_settings')->where('id', 1)->update([...$data, 'updated_at' => now()]);
            $access->audit($request->user()->id, 'feed_moderation.settings.update', 'feed_moderation_settings', 1,
                ['hold_clean_content' => (bool) $before->hold_clean_content], $data, 'Administrator updated feed publication workflow');
        }, 3);
        return back();
    }

    /** Omni is free. Never bypass Responses budget admission for a synthetic test. */
    public function testModeration(Request $request, AiAdminAccess $access, PostContentCheckService $checker): JsonResponse
    {
        $access->authorize($request->user(), 'ai.manage_features');
        if (config('pm-ai.post_check_provider') !== 'omni') {
            return response()->json(['message' => 'Live testing here is available for Omni only. Use the connection test for the Responses provider.'], 422);
        }
        try {
            $result = $checker->inspect('This is a routine project management update about our delivery schedule.', null, null);
        } catch (\RuntimeException $exception) {
            $safeCodes = ['POST_CHECK_NOT_CONFIGURED', 'POST_CHECK_KEY_DENIED', 'POST_CHECK_RATE_LIMITED', 'POST_CHECK_PROVIDER_UNAVAILABLE', 'POST_CHECK_INVALID_RESULT'];
            $code = in_array($exception->getMessage(), $safeCodes, true) ? $exception->getMessage() : 'POST_CHECK_UNEXPECTED_ERROR';
            return response()->json(['message' => 'Moderation test failed: '.$code], 422);
        }
        $access->audit($request->user()->id, 'feed_moderation.connection.test', 'feed_moderation_settings', 1, null, null, 'Administrator tested Omni with synthetic content');
        return response()->json([
            'decision' => $result['violates'] ? 'Restricted' : ($result['needs_review'] ? 'Needs review' : 'Allowed'),
            'category' => $result['category'],
            'action' => $result['violates'] ? 'Restrict' : ($result['needs_review'] || app(FeedModerationSettings::class)->holdCleanContent() ? 'Hold for review' : 'Publish automatically'),
        ]);
    }

    private function feedModel(): ?string
    {
        return match (config('pm-ai.post_check_provider')) {
            'omni' => \App\Domain\AI\Services\OmniPostModerationService::MODEL,
            'responses' => PostContentCheckService::MODEL,
            default => null,
        };
    }

    public function connection(Request $request, string $feature, AiAdminAccess $access, FeatureConnectionStatus $connection): JsonResponse
    {
        $access->authorize($request->user(), in_array($feature, ['daily-challenge', 'daily-challenge-review'], true) ? 'ai.manage_editorial' : 'ai.manage_features');
        $model = match ($feature) {
            'daily-challenge' => DB::table('ai_features')->where('code', 'scenario_generate')->value('model'),
            'daily-challenge-review' => DB::table('ai_features')->where('code', 'daily_challenge_review')->value('model'),
            'pmp' => DB::table('ai_features')->where('code', 'pmp_explain')->value('model'),
            'pmp-followup' => DB::table('ai_features')->where('code', 'pmp_followup')->value('model'),
            'feed-moderation' => $this->feedModel(),
            default => DB::table('ai_features')->where('code', $feature)->value('model'),
        };
        $result = $connection->test($feature, $model, $request->user()->id);
        $access->audit($request->user()->id, 'feature.connection.test', 'ai_connection_test', $request->user()->id, null,
            ['feature' => $feature, 'code' => $result['code']], 'Administrator tested feature AI connection');
        return response()->json($result);
    }

    public function connectionStatus(Request $request, string $feature, string $uuid, AiAdminAccess $access, FeatureConnectionStatus $connection): JsonResponse
    {
        $access->authorize($request->user(), in_array($feature, ['daily-challenge', 'daily-challenge-review'], true) ? 'ai.manage_editorial' : 'ai.manage_features');
        return response()->json($connection->testStatus($feature, $uuid, $request->user()->id));
    }
}
