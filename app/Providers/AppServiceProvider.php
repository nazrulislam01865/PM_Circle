<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Separately registered adapters allow a previously used provider to process
        // independently verified refunds after the checkout provider is changed.
        $this->app->bind('payments.gateway.bkash',
            \App\Domain\Billing\Payments\Gateways\UnconfiguredGateway::class);
        $this->app->bind('payments.gateway.nagad',
            \App\Domain\Billing\Payments\Gateways\UnconfiguredGateway::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // Keep demo membership switching independent of unrelated member requests.
        RateLimiter::for('course-lesson-write', fn (Request $request) => Limit::perMinute(30)->by('course-lesson:'.$request->user()->getAuthIdentifier()));

        RateLimiter::for('support-submit', fn ($request) => Limit::perMinute(5)->by('support-submit:'.$request->user()->getAuthIdentifier()));

        // Separate local extraction from generic member throttles and AI quotas.
        RateLimiter::for('resume-assistant-export', fn (Request $request) => Limit::perMinute(10)->by('resume-assistant-export:'.($request->user()?->getAuthIdentifier() ?? $request->ip())));

        RateLimiter::for('resume-assistant-extract', function (Request $request): array {
            $member = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
            return [
                Limit::perMinute(3)->by('resume-assistant-extract-minute:'.$member),
                Limit::perHour(20)->by('resume-assistant-extract-hour:'.$member),
            ];
        });

        RateLimiter::for('membership-switch', function (Request $request): Limit {
            $member = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return Limit::perMinute(10)->by('membership-switch:'.$member);
        });

        // Diagnostics must not share the generic authenticated request signature.
        // Each feature/action gets its own bounded counter, including queue polling.
        RateLimiter::for('admin-ai-diagnostic', function (Request $request): Limit {
            $actor = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
            $scope = $request->route()->getName().':'.$request->route('feature', '');

            return Limit::perMinute(5)->by($actor.':'.$scope);
        });

        RateLimiter::for('admin-ai-workspace-test', function (Request $request): array {
            $actor = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());
            $target = $request->route()->getName().':'.$request->route('id', $request->route('slot', ''));
            return [Limit::perMinute(20)->by('workspace:'.$actor), Limit::perMinute(5)->by('workspace:'.$actor.':'.$target)];
        });

        RateLimiter::for('admin-ai-diagnostic-status', function (Request $request): Limit {
            $actor = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return Limit::perMinute(60)->by($actor.':'.$request->route()->getName().':'.$request->route('feature', ''));
        });

        // Repeated clicks and retries are bounded per member, independent of other routes.
        RateLimiter::for('pmp-exam-start', function (Request $request): array {
            $member = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return [
                Limit::perMinute(20)->by('pmp-exam-start-minute:'.$member),
                Limit::perHour(100)->by('pmp-exam-start-hour:'.$member),
            ];
        });

        // Submitting an exam is idempotent; limit abusive retries per member and attempt,
        // without letting earlier attempts block a new submission.
        RateLimiter::for('pmp-exam-submit', function (Request $request): array {
            $member = (string) ($request->user()?->getAuthIdentifier() ?? $request->ip());

            return [
                Limit::perMinute(30)->by('pmp-exam-submit-attempt:'.$member.':'.$request->route('attempt')),
                Limit::perMinute(120)->by('pmp-exam-submit-member:'.$member),
            ];
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Align registration, reset and account-password validation at 8 characters.
        Password::defaults(fn (): Password => Password::min(8));
    }
}
