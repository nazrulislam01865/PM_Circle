<?php

namespace App\Http\Controllers\Admin\DailyChallenge;

use App\Domain\AI\Services\AiAdminAccess;
use App\Domain\AI\Services\AiEditorialService;
use App\Domain\AI\Support\AiFailure;
use App\Domain\DailyChallenge\Services\DailyChallengeSettings;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class DailyChallengeController extends Controller
{
    public function index(Request $request, AiAdminAccess $access, DailyChallengeSettings $policy): Response
    {
        $access->authorize($request->user(), 'ai.manage_editorial');
        $settings = $policy->get();
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
            'readiness' => [
                'gateway' => (bool) config('pm-ai.enabled'),
                'editorial' => (bool) config('pm-ai.editorial_enabled'),
                'separate_key' => filled(config('pm-ai.daily_challenge_api_key')),
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
                'global_budget' => (float) config('pm-ai.global_daily_budget_usd') > 0,
                'editorial_budget' => (float) config('pm-ai.editorial_budget_usd') > 0,
            ],
            'recent' => DB::table('scenarios')->where('ai_generated', true)
                ->whereNotNull('daily_slot')->orderByDesc('id')->limit(20)
                ->get(['id', 'title', 'daily_slot', 'slug', 'status', 'published_at', 'expires_at']),
            'drafts' => DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
                ->orderByDesc('id')->limit(20)
                ->get(['id', 'slot_key', 'status', 'publication_at', 'created_at']),
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
            'reason' => ['required', 'string', 'min:8', 'max:500'],
        ]);
        if (($data['auto_publish'] || $data['auto_review']) && ! $data['enabled']) {
            throw ValidationException::withMessages(['enabled' => 'Enable daily challenges first.']);
        }
        if ($data['enabled'] && ! $policy->isReady()) {
            throw ValidationException::withMessages(['enabled' =>
                'The centralized AI gateway, editorial switch and dedicated API key must be configured on the server.']);
        }
        DB::transaction(function () use ($request, $data, $access): void {
            $before = DB::table('daily_challenge_settings')->where('id', 1)->lockForUpdate()->first();
            $values = collect($data)->except('reason')->all();
            DB::table('daily_challenge_settings')->where('id', 1)->update([...$values, 'updated_at' => now()]);
            // Adjust yet-unpublished slots after changing the publish clock. Existing public
            // challenges keep their individually pinned expiration time.
            if ($before->publish_time !== $data['publish_time']) {
                $drafts = DB::table('ai_editorial_drafts')->where('feature', 'scenario_generate')
                    ->whereIn('status', ['queued', 'pending_review', 'approved'])
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
        $data = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);
        if (! $policy->get()->enabled || ! $policy->isReady()) {
            throw ValidationException::withMessages(['date' => 'Enable and configure Daily Challenge AI first.']);
        }
        try {
            $editorial->queueScenarioSlot($data['date']);
        } catch (AiFailure $e) {
            throw ValidationException::withMessages(['date' => $e->safeCode]);
        }
        return back()->with('status', 'Generation submitted. Check the editorial draft status.');
    }
}
