<?php

namespace App\Http\Controllers\Admin\DailyChallenge;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiEditorialService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Support\Admin\DailyChallengeMasterData;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class DailyChallengeController extends Controller
{
    public function index(Request $request, AiAdminAccess $access, DailyChallengeSettings $policy): Response
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $settings = (array) $policy->get();
        $settings['generation_domains'] = json_decode((string) ($settings['generation_domains'] ?? '[]'), true) ?: [];
        $settings['generation_topics'] = json_decode((string) ($settings['generation_topics'] ?? '[]'), true) ?: [];
        $features = DB::table('ai_features')->whereIn('code', ['scenario_generate', 'daily_challenge_review'])
            ->get(['code', 'enabled', 'model', 'prompt_version', 'credit_tariff'])->keyBy('code');
        $promptReady = [];
        foreach ($features as $feature) {
            $promptReady[$feature->code] = DB::table('ai_prompt_versions')
                ->where('feature_code', $feature->code)->where('version', $feature->prompt_version)
                ->whereNotNull('published_at')->exists();
        }
        return Inertia::render('admin/DailyChallenge', [
            'settings' => $settings,
            'generationNotice' => $request->session()->get('daily_generation_notice'),
            'today' => now('Asia/Dhaka')->toDateString(),
            'connection' => app(\App\Domain\AI\Services\FeatureConnectionStatus::class)->status('daily-challenge', $features->get('scenario_generate')?->model, (bool) $features->get('scenario_generate')?->enabled),
            'generationOptions' => DailyChallengeMasterData::options(),
            'retryableErrors' => AiEditorialService::SCENARIO_RETRYABLE_ERRORS,
            'readiness' => [
                'gateway' => (bool) config('pm-ai.enabled'),
                'editorial' => (bool) config('pm-ai.editorial_enabled'),
                'separate_key' => app(\App\Domain\AI\Services\AiFeatureRouting::class)->configured('scenario_generate', 'daily_challenge_api_key'),
                'moderation_key' => filled(app(\App\Domain\AI\Services\AiRuntimeSettings::class)->credential('post_check_api_key')),
                'model' => 'gpt-5-nano',
                'generation_feature' => (bool) ($features->get('scenario_generate')?->enabled)
                    && $features->get('scenario_generate')?->model === 'gpt-5-nano'
                    && ($promptReady['scenario_generate'] ?? false),
                'review_feature' => (bool) ($features->get('daily_challenge_review')?->enabled)
                    && $features->get('daily_challenge_review')?->model === 'gpt-5-nano'
                    && (int) $features->get('daily_challenge_review')?->credit_tariff === 0
                    && ($promptReady['daily_challenge_review'] ?? false),
                'pricing' => DB::table('ai_model_prices')->where('model', 'gpt-5-nano')
                    ->where('effective_from', '<=', now())->exists(),
                'global_budget' => (float) app(\App\Domain\AI\Services\AiRuntimeSettings::class)->budget('global_daily_budget_usd') > 0,
                'editorial_budget' => (float) app(\App\Domain\AI\Services\AiRuntimeSettings::class)->budget('editorial_budget_usd') > 0,
            ],
            'recent' => DB::table('scenarios')->where('ai_generated', true)
                ->whereNotNull('daily_slot')->orderByDesc('id')->limit(20)
                ->get(['id', 'title', 'daily_slot', 'slug', 'status', 'published_at', 'expires_at']),
            'drafts' => DB::table('ai_editorial_drafts as d')->leftJoin('ai_requests as r', 'r.id', '=', 'd.request_id')
                ->where('d.feature', 'scenario_generate')->orderByDesc('d.slot_key')->limit(30)
                ->select(['d.id', 'd.slot_key', 'd.status', 'd.publication_at', 'd.created_at',
                    'd.generation_attempts', 'd.archive_recovery', 'r.status as request_status', 'r.error_code'])
                ->selectRaw('CASE WHEN d.payload_encrypted IS NOT NULL THEN 1 ELSE 0 END AS has_payload')->get(),
        ]);
    }

    public function update(Request $request, AiAdminAccess $access,
        DailyChallengeSettings $policy): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'auto_publish' => ['required', 'boolean'],
            'auto_review' => ['required', 'boolean'],
            'publish_time' => ['required', 'date_format:H:i'],
            'expiry_hours' => ['required', 'integer', 'between:1,168'],
            'max_reviews_per_user_daily' => ['required', 'integer', 'between:1,50'],
            'generation_title_hint' => ['nullable', 'string', 'max:180'],
            'generation_domains' => ['present', 'array', 'max:5'],
            'generation_domains.*' => ['string', 'distinct', Rule::exists('master_data_options', 'value')
                ->where('category', 'daily_challenge_domain')->where('is_active', true)],
            'generation_topics' => ['present', 'array', 'max:8'],
            'generation_topics.*' => ['string', 'distinct', Rule::exists('master_data_options', 'value')
                ->where('category', 'daily_challenge_topic')->where('is_active', true)],
            'generation_difficulty' => ['nullable', 'string', Rule::exists('master_data_options', 'value')
                ->where('category', 'daily_challenge_difficulty')->where('is_active', true)],
            'generation_approach' => ['nullable', 'string', Rule::exists('master_data_options', 'value')
                ->where('category', 'daily_challenge_approach')->where('is_active', true)],
            'generation_notes' => ['nullable', 'string', 'max:500'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        // Saving the enabled automation explicitly opts in to automatic publication.
        $data['auto_publish'] = (bool) $data['enabled'];
        if ($data['auto_review'] && ! $data['enabled']) {
            throw ValidationException::withMessages(['enabled' => 'Enable daily challenges first.']);
        }
        if ($data['enabled'] && ! $policy->isReady()) {
            throw ValidationException::withMessages(['enabled' =>
                'Enable the AI gateway and editorial workflow, then assign a tested Daily Challenge credential in AI Workspace.']);
        }
        DB::transaction(function () use ($request, $data, $access): void {
            $before = DB::table('daily_challenge_settings')->where('id', 1)->lockForUpdate()->first();
            $values = collect($data)->except('reason')->all();
            $values['generation_title_hint'] = trim((string) ($data['generation_title_hint'] ?? '')) ?: null;
            $values['generation_notes'] = trim((string) ($data['generation_notes'] ?? '')) ?: null;
            $values['generation_difficulty'] = $data['generation_difficulty'] ?? null;
            $values['generation_approach'] = $data['generation_approach'] ?? null;
            $values['generation_domains'] = json_encode($data['generation_domains'], JSON_THROW_ON_ERROR);
            $values['generation_topics'] = json_encode($data['generation_topics'], JSON_THROW_ON_ERROR);
            DB::table('daily_challenge_settings')->where('id', 1)->update([...$values, 'updated_at' => now()]);
            // Legacy generated drafts need no staff approval. Pausing automation
            // leaves ready drafts scheduled; publication itself checks the saved policy.
            if ($data['auto_publish']) {
                DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
                    ->where('slot_key', 'like', 'daily-scenario:%')
                    ->where('status', 'pending_review')->whereNotNull('payload_encrypted')
                    ->update([
                        'status' => 'scheduled',
                        'updated_at' => now(),
                    ]);
            }
            // Adjust yet-unpublished slots after changing the publish clock. Existing public
            // challenges keep their individually pinned expiration time.
            if ($before->publish_time !== $data['publish_time']) {
                $drafts = DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
                    ->whereIn('status', ['queued', 'scheduled', 'pending_review', 'approved'])
                    ->where('slot_key', 'like', 'daily-scenario:%')->get(['id', 'slot_key']);
                foreach ($drafts as $draft) {
                    $day = substr($draft->slot_key, strlen('daily-scenario:'));
                    if (! preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $day)) continue;
                    [$hour, $minute] = array_map('intval', explode(':', $data['publish_time']));
                    $publishAt = Carbon::createFromFormat('!Y-m-d', $day, 'Asia/Dhaka')
                        ->setTime($hour, $minute)->utc();
                    DB::table('ai_editorial_drafts')->where('id', $draft->id)
                        ->update(['publication_at' => $publishAt, 'updated_at' => now()]);
                }
            }
            $access->audit($request->user()->id, 'daily_challenge.settings.update',
                'daily_challenge_settings', 1, (array) $before, $values, $data['reason']);
        }, 3);
        return back()->with('status', 'Daily Challenge settings saved.');
    }

    public function expire(Request $request, int $scenario, AiAdminAccess $access): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'expires_at' => ['required', 'date'],
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        DB::transaction(function () use ($scenario, $request, $data, $access): void {
            $row = DB::table('scenarios')->where('id', $scenario)->lockForUpdate()->first();
            abort_unless($row && $row->ai_generated && $row->daily_slot, 404);
            $expiry = Carbon::parse($data['expires_at']);
            if ($expiry->lt(Carbon::parse($row->published_at))) {
                throw ValidationException::withMessages(['expires_at' => 'Expiration cannot precede publication.']);
            }
            // Never reopen a closed discussion by moving its expiry into the future.
            $status = $expiry->isPast() ? 'closed' : $row->status;
            DB::table('scenarios')->where('id', $scenario)->update([
                'expires_at' => $expiry, 'status' => $status, 'updated_at' => now(),
            ]);
            $access->audit($request->user()->id, 'daily_challenge.expire', 'scenarios', $scenario,
                ['expires_at' => $row->expires_at, 'status' => $row->status],
                ['expires_at' => $expiry->toISOString(), 'status' => $status], $data['reason']);
        });
        return back()->with('status', 'Challenge expiry updated.');
    }

    public function generate(Request $request, AiAdminAccess $access,
        AiEditorialService $editorial, DailyChallengeSettings $policy): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'exact_title' => ['nullable', 'string', 'min:5', 'max:180'],
            'archive_recovery' => ['sometimes', 'boolean'],
        ]);
        if (! $policy->get()->enabled || ! $policy->get()->auto_publish || ! $policy->isReady()) {
            throw ValidationException::withMessages(['date' => 'Enable and configure Daily Challenge AI first.']);
        }
        try {
            $result = $editorial->queueScenarioSlot($data['date'], $data['exact_title'] ?? null, manual: true, actorId: $request->user()->id,
                archiveRecovery: (bool) ($data['archive_recovery'] ?? false));
        } catch (AiFailure $e) {
            throw ValidationException::withMessages(['date' => match ($e->safeCode) {
                'MODERATION_NOT_CONFIGURED' => 'Configure the Post Check moderation credential in AI Workspace first.',
                'PAST_PUBLICATION_DATE' => 'Choose today or a future date.',
                'PUBLICATION_WINDOW_CLOSED' => 'The publication window for this date has closed. Use archive recovery for an existing failed slot.',
                'ARCHIVE_RECOVERY_NOT_ELIGIBLE' => 'Only existing failed challenges can be recovered into the archive.',
                default => $e->safeCode,
            }]);
        }
        if (isset($result['retry_limit_reached']) || isset($result['blocked'])) {
            throw ValidationException::withMessages(['date' => isset($result['retry_limit_reached'])
                ? 'Retry limit reached for this slot. Review the AI request history before recovery.'
                : 'This failed slot needs reconciliation or review before it can be regenerated.']);
        }
        return back()->with('daily_generation_notice', isset($result['request'])
            ? ((bool) ($data['archive_recovery'] ?? false)
                ? 'Recovery queued. Validated historical content will publish automatically as a closed archive entry.'
                : 'Challenge generation queued. Validated content will publish automatically at the scheduled time.')
            : 'This date already has a challenge or generation request. Nothing was overwritten.');
    }

    public function publishDraft(Request $request, int $draft, AiAdminAccess $access,
        AiEditorialService $editorial): RedirectResponse
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        try {
            $scenario = $editorial->publishAutomatedScenario($draft, $request->user()->id);
        } catch (AiFailure $failure) {
            throw ValidationException::withMessages(['date' => $failure->safeCode]);
        }
        if (! $scenario) {
            throw ValidationException::withMessages(['date' => 'This challenge is not ready or not due. Check the saved automation settings and refresh its status.']);
        }
        return back()->with('daily_generation_notice', 'Challenge published. Historical entries remain closed.');
    }

}
