<?php

namespace App\Domain\Billing\Actions;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Grants temporary feature access ONLY in local/testing, without creating financial records. */
final class SetTemporaryMembership
{
    public static function enabled(): bool
    {
        return app()->environment(['local', 'testing'])
            && (bool) config('pm-circle.temporary_paid_access_enabled', false);
    }

    public function execute(User $user, string $code): void
    {
        abort_unless(self::enabled(), 403);
        if (! in_array($code, ['free', 'plus', 'pro'], true)) {
            throw ValidationException::withMessages(['plan' => 'The selected membership is unavailable.']);
        }
        if ($code !== 'free' && ! DB::table('plans')->where('code', $code)->where('active', true)->exists()) {
            throw ValidationException::withMessages(['plan' => 'The selected membership is currently unavailable.']);
        }

        DB::transaction(function () use ($user, $code): void {
            DB::table('users')->where('id', $user->getKey())->lockForUpdate()->first();
            DB::table('temporary_memberships')->updateOrInsert(
                ['user_id' => $user->getKey()],
                ['plan_code' => $code, 'updated_at' => now(), 'created_at' => now()],
            );
        });
    }
}
