<?php

namespace App\Domain\Billing\Actions;

use App\Models\PlanPrice;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Records a non-billed membership grant, never a paid subscription. */
final class SetTemporaryMembership
{
    public static function enabled(): bool
    {
        return (app()->environment(['local', 'testing'])
                && (bool) config('pm-circle.temporary_paid_access_enabled', false))
            || (bool) config('pm-circle.self_service_complimentary_access_enabled', false);
    }

    /** Demo switching is independent from the permission to grant signup access. */
    public static function switchingEnabled(): bool
    {
        return (app()->environment(['local', 'testing'])
                && (bool) config('pm-circle.temporary_paid_access_enabled', false))
            || (self::enabled() && (bool) config('pm-circle.self_service_complimentary_switching_enabled', false));
    }

    public function execute(User $user, string $code, ?int $months = null, bool $signup = false): void
    {
        $enabled = self::enabled();
        abort_unless($signup ? ($enabled || $code === 'free') : self::switchingEnabled(), 403);
        if (! in_array($code, ['free', 'plus', 'pro'], true)) {
            throw ValidationException::withMessages(['plan' => 'The selected membership is unavailable.']);
        }

        if (($signup || $code !== 'free') && ($months === null || $months < 1 || $months > 60)) {
            throw ValidationException::withMessages(['months' => 'Choose an available membership duration.']);
        }

        DB::transaction(function () use ($user, $code, $months, $signup, $enabled): void {
            $locked = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            if ($signup && $locked->onboarding_step >= 3) {
                return; // A retried signup cannot restart the membership clock.
            }
            if ($signup || $code !== 'free') {
                $price = PlanPrice::query()->whereHas('plan', fn ($query) => $query->where('code', $code)->where('active', true)
                    ->when($signup, fn ($plan) => $plan->where('signup_visible', true)))
                    ->where('months', $months)->where('active', true)->orderByDesc('version')->first(['id']);
                if (! $price) {
                    throw ValidationException::withMessages(['months' => 'This plan duration is unavailable.']);
                }
            }

            if ($enabled) {
                $existing = DB::table('temporary_memberships')->where('user_id', $locked->id)->first();
                // Preserve the existing active term on repeated same-plan requests. Only the
                // administrator may adjust it. Switching to a different plan remains opt-in demo behavior.
                $now = now();
                $sameActive = $existing && $existing->plan_code === $code
                    && ($existing->ends_at === null || $existing->ends_at > $now->toDateTimeString());
                if (! $sameActive || $signup) {
                    $term = $code === 'free' ? null : $months;
                    $values = [
                        'plan_code' => $code, 'months' => $term,
                        'starts_at' => $term === null ? null : $now,
                        'ends_at' => $term === null ? null : $now->copy()->addMonthsNoOverflow($term),
                        'updated_at' => $now,
                    ];
                    if ($existing) {
                        DB::table('temporary_memberships')->where('user_id', $locked->id)->update($values);
                    } else {
                        DB::table('temporary_memberships')->insert(['user_id' => $locked->id, 'created_at' => $now, ...$values]);
                    }
                }
            }
            if ($signup) {
                $locked->update(['onboarding_step' => 3]);
            }
        }, 3);
    }
}
