<?php

namespace App\Domain\Billing\Services;

use App\Domain\Identity\Services\ProfileCompleteness;
use App\Models\ProfileCompletionReward;
use App\Models\ProfileRewardSetting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/** Issues one member-bound code, while leaving payment authorization to a future real checkout. */
final class ProfileCompletionRewardService
{
    private const SETTINGS_CACHE_KEY = 'pm-circle:profile-reward-settings:v1';

    public function __construct(private readonly ProfileCompleteness $completeness) {}

    public function settings(): ProfileRewardSetting
    {
        $values = Cache::remember(self::SETTINGS_CACHE_KEY, 60, fn (): array =>
            ProfileRewardSetting::query()->find(1)?->only(['enabled', 'discount_type', 'discount_value', 'currency', 'validity_days'])
                ?? ['enabled' => true, 'discount_type' => 'percent', 'discount_value' => '10.00', 'currency' => 'BDT', 'validity_days' => 5]
        );

        return new ProfileRewardSetting($values);
    }

    public function clearSettingsCache(): void
    {
        Cache::forget(self::SETTINGS_CACHE_KEY);
    }

    public function publicPromotion(): ?array
    {
        $settings = $this->settings();

        return $settings->enabled ? [
            'discountLabel' => $this->label($settings->discount_type, $settings->discount_value, $settings->currency),
            'validityDays' => $settings->validity_days,
        ] : null;
    }

    public function forMember(User $user, ?int $completion = null): ?array
    {
        if ($user->is_admin || $user->onboarding_step < 3 || ! $user->hasVerifiedEmail()) {
            return null;
        }

        $completion ??= $this->completeness->percentage($user);
        $settings = $this->settings();
        // Incomplete members must never receive a usable code (even if previously earned).
        if ($completion < 100) {
            return $settings->enabled ? ['status' => 'pending', 'discountLabel' => $this->label($settings->discount_type, $settings->discount_value, $settings->currency)] : null;
        }

        $reward = ProfileCompletionReward::query()->where('user_id', $user->getKey())->first();
        if (! $reward && $settings->enabled) {
            // createOrFirst resolves concurrent first visits through the unique user_id constraint.
            $reward = ProfileCompletionReward::query()->createOrFirst(['user_id' => $user->getKey()], [
                'code' => $this->generateCode($settings),
                'discount_type' => $settings->discount_type,
                'discount_value' => $settings->discount_value,
                'currency' => $settings->currency,
                'validity_days' => $settings->validity_days,
                'expires_at' => now()->addDays($settings->validity_days),
            ]);
        }

        if (! $reward) {
            return null;
        }

        $status = $reward->redeemed_at ? 'redeemed' : ($reward->expires_at->isPast() ? 'expired' : 'ready');

        return [
            'status' => $status,
            'discountLabel' => $this->label($reward->discount_type, $reward->discount_value, $reward->currency),
            'code' => $status === 'ready' ? $reward->code : null,
            'expiresAt' => $reward->expires_at->toIso8601String(),
            'validityDays' => $reward->validity_days,
        ];
    }

    /** Minor-unit arithmetic for an eventual server-verified simulator checkout. No public redemption route exists. */
    public function discountMinor(User $user, string $code, int $subtotalMinor, string $currency, string $productScope): int
    {
        $reward = ProfileCompletionReward::query()->where('user_id', $user->getKey())
            ->where('code', $code)->first();

        if (! $reward || $user->is_admin || $this->completeness->percentage($user) !== 100
            || $user->onboarding_step < 3 || ! $user->hasVerifiedEmail()
            || $reward->redeemed_at || $reward->expires_at->isPast()
            || $productScope !== 'simulator'
            || ($reward->discount_type === 'fixed' && $reward->currency !== strtoupper($currency)) || $subtotalMinor <= 0) {
            throw ValidationException::withMessages(['coupon' => 'This reward is not valid for the selected purchase.']);
        }

        // decimal:2 -> integer hundredths. No floating-point money calculations.
        $valueHundredths = (int) str_replace('.', '', (string) $reward->discount_value);
        $discount = $reward->discount_type === 'percent'
            ? intdiv($subtotalMinor * $valueHundredths + 5000, 10000)
            : $valueHundredths;

        return min($subtotalMinor, $discount);
    }

    /** Call ONLY after a payment has been verified by the gateway, in the payment transaction. */
    public function markRedeemedAfterVerifiedPayment(User $user, string $code, string $paymentReference, int $subtotalMinor, string $currency, string $productScope): void
    {
        DB::transaction(function () use ($user, $code, $paymentReference, $subtotalMinor, $currency, $productScope): void {
            $reward = ProfileCompletionReward::query()->where('user_id', $user->getKey())
                ->where('code', $code)->lockForUpdate()->first();

            if ($reward && $reward->redemption_reference === $paymentReference && $reward->redeemed_at) {
                return; // The same verified callback can safely be retried.
            }

            if (! $reward || $reward->redeemed_at || $reward->expires_at->isPast()
                || $user->is_admin || $this->completeness->percentage($user) !== 100
                || $user->onboarding_step < 3 || ! $user->hasVerifiedEmail()
                || trim($paymentReference) === '') {
                throw ValidationException::withMessages(['coupon' => 'This reward can no longer be redeemed.']);
            }

            $this->discountMinor($user, $code, $subtotalMinor, $currency, $productScope);
            $reward->forceFill(['redeemed_at' => now(), 'redemption_reference' => $paymentReference])->save();
        });
    }

    private function generateCode(ProfileRewardSetting $settings): string
    {
        $prefix = $settings->discount_type === 'percent' ? 'PM'.(int) $settings->discount_value : 'PMC';

        return $prefix.'-'.Str::upper(Str::random(10));
    }

    private function label(string $type, string $value, string $currency): string
    {
        $number = rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');

        return $type === 'percent' ? $number.'% off' : $currency.' '.$number.' off';
    }
}
