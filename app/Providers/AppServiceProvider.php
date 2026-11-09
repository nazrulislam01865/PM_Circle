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
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

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
