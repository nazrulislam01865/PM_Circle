<?php

namespace App\Console\Commands;

use App\Domain\DailyChallenge\Services\DailyChallengeModerationProbe;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** Health checks are read-only except an opt-in safe synthetic API call. */
final class CheckDailyChallengeAi extends Command
{
    protected $signature = 'daily-challenge:check {--probe : Verify the Post Check Omni key can call Moderations}';

    protected $description = 'Inspect Daily Challenge readiness, failed drafts, and external Moderations capability';

    public function handle(DailyChallengeModerationProbe $probe): int
    {
        $settings = DB::table('daily_challenge_settings')->where('id', 1)->first();
        if (! $settings) {
            $this->error('Daily Challenge settings are missing; check migrations.');
            return self::FAILURE;
        }

        $features = DB::table('ai_features')
            ->whereIn('code', ['scenario_generate', 'daily_challenge_review'])
            ->get(['code', 'enabled', 'model', 'prompt_version'])->keyBy('code');

        foreach (['scenario_generate', 'daily_challenge_review'] as $code) {
            $feature = $features->get($code);
            $prompt = $feature && DB::table('ai_prompt_versions')
                ->where('feature_code', $code)->where('version', $feature->prompt_version)
                ->whereNotNull('published_at')->exists();
            $this->line(sprintf('%s: enabled=%s, model=%s, prompt_published=%s', $code,
                $feature?->enabled ? 'yes' : 'no', $feature?->model ?? '(missing)', $prompt ? 'yes' : 'no'));
        }

        $this->line('Gateway enabled: '.(config('pm-ai.enabled') ? 'yes' : 'no'));
        $this->line('Editorial enabled: '.(config('pm-ai.editorial_enabled') ? 'yes' : 'no'));
        $this->line('Dedicated key configured: '.(filled(config('pm-ai.daily_challenge_api_key')) ? 'yes' : 'no'));
        $this->line('Post Check Omni key configured: '.(filled(config('pm-ai.post_check_api_key')) ? 'yes' : 'no'));
        $this->line('Publication (Asia/Dhaka): '.$settings->publish_time);
        $this->line('Auto-publish: '.($settings->auto_publish ? 'yes' : 'no'));
        $this->line('Auto-review: '.($settings->auto_review ? 'yes' : 'no'));

        $failed = DB::table('ai_editorial_drafts')
            ->where('feature', 'scenario_generate')->where('status', 'failed')
            ->where('slot_key', '>=', 'daily-scenario:'.now('Asia/Dhaka')->toDateString())
            ->orderBy('slot_key')->limit(15)
            ->get(['id', 'slot_key', 'generation_attempts']);
        $this->line('Upcoming failed drafts (up to 15): '.$failed->count());
        foreach ($failed as $draft) {
            $this->line(sprintf('  #%d %s attempts=%d', $draft->id, $draft->slot_key, $draft->generation_attempts));
        }
        $this->line('Unscored failed member responses: '.DB::table('scenario_responses')
            ->where('ai_review_status', 'failed')->whereNull('ai_score')->count());

        if (! $this->option('probe')) {
            $this->comment('Use --probe to test the Post Check Omni key against the Moderations API.');
            return self::SUCCESS;
        }

        $result = $probe->check();
        $this->line('Moderation probe: '.$result['code']
            .' HTTP='.($result['http_status'] ?? 'n/a')
            .' request_id='.($result['request_id'] ?? 'n/a'));

        return $result['ok'] ? self::SUCCESS : self::FAILURE;
    }
}
