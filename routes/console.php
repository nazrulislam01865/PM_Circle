<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Import only when enabled; never scrape during a public web request.
if (config('jobspy.enabled')) {
    Schedule::command('careers:fetch')->twiceDaily(8, 20)->withoutOverlapping();
}

// Durable request rows are also the transactional outbox; a missed dispatch is recovered safely.
Artisan::command('ai:recover', function (): void {
    $pending = \Illuminate\Support\Facades\DB::table('ai_requests')
        ->where('status', 'queued')->where('lease_until', '<', now())
        ->orderBy('id')->limit(100)->get(['id', 'feature_code', 'dispatch_count']);
    foreach ($pending as $row) {
        if ($row->dispatch_count >= 5) {
            app(\App\Domain\AI\Services\AiExecutionService::class)
                ->fail($row->id, 'QUEUE_DELIVERY_FAILED');
            continue;
        }
        $claimed = \Illuminate\Support\Facades\DB::table('ai_requests')
            ->where('id', $row->id)->where('status', 'queued')
            ->where('lease_until', '<', now())->update([
                'lease_until' => now()->addSeconds(config('pm-ai.lease_seconds')),
                'dispatch_count' => $row->dispatch_count + 1, 'updated_at' => now(),
            ]);
        if ($claimed) {
            \App\Domain\AI\Jobs\ExecuteAiRequest::dispatch($row->id)
                ->onQueue(in_array($row->feature_code, ['scenario_generate', 'trend_draft'], true)
                    ? config('pm-ai.editorial_queue') : config('pm-ai.queue'));
        }
    }
    // A running request that outlived its lease is ambiguous, NOT assumed refundable.
    \Illuminate\Support\Facades\DB::table('ai_requests')->where('status', 'running')
        ->where('lease_until', '<', now())->update([
            'status' => 'provider_status_unknown', 'error_code' => 'RECONCILING',
            'updated_at' => now(),
        ]);
    $this->info('AI recovery scan completed; unresolved provider calls remain held for reconciliation.');
})->purpose('Safely recover queued AI jobs and flag ambiguous provider outcomes');

Artisan::command('ai:expire-grants', function (): void {
    $this->info('Expired grants: '.app(\App\Domain\AI\Services\AiCreditService::class)->expire());
})->purpose('Expire only available credits through auditable ledger events');

Artisan::command('ai:grant-cycles', function (): void {
    $this->info('New paid subscription cycle grants: '.
        app(\App\Domain\AI\Services\AiSubscriptionGrantService::class)->grantDueCycles());
})->purpose('Idempotently grant approved credits for verified paid subscription cycles');

Artisan::command('ai:prepare-scenarios', function (): void {
    if (! config('pm-ai.editorial_enabled')) {
        return;
    }
    $policy = app(\App\Domain\DailyChallenge\Services\DailyChallengeSettings::class);
    $settings = $policy->get();
    if (! $settings->enabled || ! $settings->auto_publish || ! $policy->isReady()) return;
    $service = app(\App\Domain\AI\Services\AiEditorialService::class);
    // Prepare today and tomorrow only, so outages do not exhaust an entire week's budget.
    for ($offset = 0; $offset <= 1; $offset++) {
        $date = now('Asia/Dhaka')->addDays($offset)->toDateString();
        try {
            $result = $service->queueScenarioSlot($date);
            $this->line($date.': '.($result['status'] ?? 'queued'));
        } catch (\App\Domain\AI\Support\AiFailure $failure) {
            $this->warn($date.': '.$failure->safeCode);
        } catch (\Throwable $failure) {
            report(new \RuntimeException('Daily Challenge admission failed for '.$date.' ('.$failure::class.').'));
            $this->warn($date.': GENERATION_ADMISSION_FAILED');
        }
    }
})->purpose('Prepare unique Daily Challenge drafts for scheduled automatic publication');

Artisan::command('ai:publish-approved', function (): void {
    if (! config('pm-ai.editorial_enabled')) {
        return;
    }
    $policy = app(\App\Domain\DailyChallenge\Services\DailyChallengeSettings::class);
    if (! $policy->get()->enabled || ! $policy->isReady()) return;
    $drafts = \Illuminate\Support\Facades\DB::table('ai_editorial_drafts')
        ->where('feature', 'scenario_generate')->where('status', 'approved')
        ->where('slot_key', 'daily-scenario:'.now('Asia/Dhaka')->toDateString())
        ->where('publication_at', '<=', now())->orderBy('id')->limit(30)->get();
    $service = app(\App\Domain\AI\Services\AiEditorialService::class);
    foreach ($drafts as $draft) {
        $approver = \App\Models\User::find($draft->reviewed_by);
        if ($approver && $approver->is_admin) {
            $service->publish($approver, $draft->id, 'Scheduled publication of previously approved draft');
        }
    }
})->purpose('Publish due challenges ONLY after recorded staff approval');


Artisan::command('daily-challenge:publish', function (): void {
    $policy = app(\App\Domain\DailyChallenge\Services\DailyChallengeSettings::class);
    if (! $policy->get()->enabled || ! $policy->get()->auto_publish || ! config('pm-ai.enabled') || ! config('pm-ai.editorial_enabled')) return;
    $editorial = app(\App\Domain\AI\Services\AiEditorialService::class);
    $ids = \Illuminate\Support\Facades\DB::table('ai_editorial_drafts')
        ->where('feature', 'scenario_generate')->whereIn('status', ['scheduled', 'pending_review', 'approved'])
        ->where(fn ($query) => $query->where('slot_key', 'daily-scenario:'.now('Asia/Dhaka')->toDateString())
            ->orWhere('archive_recovery', true))
        ->where('publication_at', '<=', now())->orderBy('publication_at')->limit(20)->pluck('id');
    foreach ($ids as $id) {
        try {
            $editorial->publishAutomatedScenario((int) $id);
        } catch (\Throwable $e) {
            // A failed draft must not prevent other due slots from publishing.
            report(new \RuntimeException('Daily Challenge slot '.$id.' could not publish: '.$e::class));
        }
    }
})->purpose('Publish completed AI daily challenge drafts only when administrator enabled automatic publication');

Artisan::command('daily-challenge:expire', function (): void {
    $this->info('Expired challenges closed: '.app(\App\Domain\DailyChallenge\Services\DailyChallengeSettings::class)->closeExpired());
})->purpose('Close daily discussions at their pinned UTC expiry without deleting their history');

Artisan::command('ai:admin-permission {user_id} {permission}', function (): void {
    $permission = (string) $this->argument('permission');
    $allowed = [
        'ai.view_reports', 'ai.manage_features', 'ai.manage_prompts',
        'ai.manage_prices', 'ai.manage_quotas', 'ai.manage_credits',
        'ai.manage_editorial', 'ai.manage_packages',
    ];
    $userId = (int) $this->argument('user_id');
    $user = \App\Models\User::find($userId);
    if (! $user?->is_admin || ! in_array($permission, $allowed, true)) {
        $this->error('Requires an existing admin account and an allowlisted AI permission.');
        return;
    }
    \Illuminate\Support\Facades\DB::table('ai_admin_permissions')->insertOrIgnore([
        'user_id' => $userId, 'permission' => $permission, 'created_at' => now(),
    ]);
    app(\App\Domain\AI\Services\AiAdminAccess::class)->audit(null,
        'permissions.bootstrap', 'users', $userId, null, ['permission' => $permission],
        'Explicit server-console administrative privilege assignment');
    $this->info('AI permission assigned from server console.');
})->purpose('Server-only bootstrap for granular AI administrative permissions');

if (config('pm-ai.enabled')) {
    Schedule::command('ai:recover')->everyFiveMinutes()->withoutOverlapping();
    Schedule::command('ai:expire-grants')->hourly()->withoutOverlapping();
    Schedule::command('ai:grant-cycles')->everyFifteenMinutes()->withoutOverlapping();
}
Schedule::command('daily-challenge:expire')->everyMinute()->withoutOverlapping();
if (config('pm-ai.enabled') && config('pm-ai.editorial_enabled')) {
    Schedule::command('ai:prepare-scenarios')->everyFifteenMinutes()->withoutOverlapping();
    Schedule::command('daily-challenge:publish')->everyFiveMinutes()->withoutOverlapping();
}
