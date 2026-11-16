<?php

namespace App\Domain\AI\Services;

use App\Domain\AI\Support\AiFailure;
use Illuminate\Support\Facades\DB;

/** All methods that mutate money-like balances MUST be called inside a DB transaction. */
final class AiCreditService
{
    public function wallet(int $userId): object
    {
        DB::table('ai_credit_wallets')->insertOrIgnore(['user_id' => $userId,
            'available' => 0, 'reserved' => 0, 'spent_lifetime' => 0,
            'created_at' => now(), 'updated_at' => now()]);

        return DB::table('ai_credit_wallets')->where('user_id', $userId)->lockForUpdate()->first();
    }

    public function grant(int $userId, string $source, string $sourceRef, int $amount,
        ?\DateTimeInterface $expiresAt = null): bool
    {
        if ($amount < 1 || $amount > 1000000 || strlen($sourceRef) > 150) {
            throw new AiFailure('INVALID_CREDIT_GRANT', 422);
        }
        return DB::transaction(function () use ($userId, $source, $sourceRef, $amount, $expiresAt): bool {
            $this->wallet($userId);
            $inserted = DB::table('ai_credit_grants')->insertOrIgnore([
                'user_id' => $userId, 'source' => $source, 'source_ref' => $sourceRef,
                'total' => $amount, 'available' => $amount,
                'expires_at' => $expiresAt, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if (! $inserted) {
                $original = DB::table('ai_credit_grants')->where('user_id', $userId)
                    ->where('source', $source)->where('source_ref', $sourceRef)->first();
                if (! $original || (int) $original->total !== $amount) {
                    throw new AiFailure('GRANT_REFERENCE_CONFLICT', 409);
                }
                return false;
            }
            $grantId = DB::table('ai_credit_grants')->where('user_id', $userId)
                ->where('source', $source)->where('source_ref', $sourceRef)->value('id');
            DB::table('ai_credit_wallets')->where('user_id', $userId)
                ->incrementEach(['available' => $amount, 'version' => 1], ['updated_at' => now()]);
            $this->event($userId, $grantId, null, 'grant', $amount, 0, 0,
                "grant:{$grantId}");
            return true;
        }, 3);
    }

    /** Lock acquired by caller, after quota buckets, before grant rows. */
    public function reserve(int $userId, int $requestId, int $amount): void
    {
        if ($amount === 0) {
            return;
        }
        $wallet = $this->wallet($userId);
        if ($wallet->available < $amount) {
            throw new AiFailure('INSUFFICIENT_CREDITS', 409);
        }
        $grants = DB::table('ai_credit_grants')->where('user_id', $userId)
            ->where('available', '>', 0)
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END')
            ->orderBy('expires_at')->orderBy('id')->lockForUpdate()->get();
        $left = $amount;
        foreach ($grants as $grant) {
            if ($left === 0) {
                break;
            }
            $used = min((int) $grant->available, $left);
            DB::table('ai_credit_grants')->where('id', $grant->id)->update([
                'available' => (int) $grant->available - $used,
                'reserved' => (int) $grant->reserved + $used, 'updated_at' => now(),
            ]);
            DB::table('ai_request_allocations')->insert([
                'request_id' => $requestId, 'grant_id' => $grant->id, 'reserved_amount' => $used,
            ]);
            $this->event($userId, (int) $grant->id, $requestId, 'reserve', -$used, $used, 0,
                "request:{$requestId}:reserve:{$grant->id}");
            $left -= $used;
        }
        if ($left !== 0) {
            throw new AiFailure('INSUFFICIENT_CREDITS', 409);
        }
        DB::table('ai_credit_wallets')->where('user_id', $userId)->update([
            'available' => (int) $wallet->available - $amount,
            'reserved' => (int) $wallet->reserved + $amount,
            'version' => (int) $wallet->version + 1, 'updated_at' => now(),
        ]);
    }

    /** Complete all allocations once; success charges <= held, terminal failures charge 0. */
    public function finish(int $userId, int $requestId, int $charge): void
    {
        $wallet = $this->wallet($userId);
        $allocations = DB::table('ai_request_allocations')->where('request_id', $requestId)
            ->orderBy('grant_id')->lockForUpdate()->get();
        $held = (int) $allocations->sum('reserved_amount');
        if ($charge < 0 || $charge > $held) {
            throw new AiFailure('INVALID_SETTLEMENT', 503);
        }
        if ($allocations->contains(fn ($row) => $row->charged_amount || $row->released_amount)) {
            throw new AiFailure('ALREADY_SETTLED', 409);
        }
        $left = $charge;
        $returned = 0;
        foreach ($allocations as $allocation) {
            $grant = DB::table('ai_credit_grants')->where('id', $allocation->grant_id)
                ->lockForUpdate()->first();
            $spent = min((int) $allocation->reserved_amount, $left);
            $released = (int) $allocation->reserved_amount - $spent;
            $expired = $released > 0 && $grant->expires_at !== null
                && \Illuminate\Support\Carbon::parse($grant->expires_at)->lte(now());
            DB::table('ai_credit_grants')->where('id', $grant->id)->update([
                'reserved' => $grant->reserved - $allocation->reserved_amount,
                'available' => $grant->available + ($expired ? 0 : $released),
                'consumed' => $grant->consumed + $spent,
                'expired' => $grant->expired + ($expired ? $released : 0),
                'updated_at' => now(),
            ]);
            DB::table('ai_request_allocations')->where('id', $allocation->id)->update([
                'charged_amount' => $spent, 'released_amount' => $released,
            ]);
            if ($spent > 0) {
                $this->event($userId, $grant->id, $requestId, 'settle', 0, -$spent, $spent,
                    "request:{$requestId}:settle:{$grant->id}");
            }
            if ($released > 0) {
                $this->event($userId, $grant->id, $requestId,
                    $expired ? 'release_expired' : 'release', $expired ? 0 : $released,
                    -$released, 0, "request:{$requestId}:release:{$grant->id}");
            }
            $returned += $expired ? 0 : $released;
            $left -= $spent;
        }
        if ($left !== 0 || $wallet->reserved < $held) {
            throw new AiFailure('INVALID_SETTLEMENT', 503);
        }
        if ($held) {
            DB::table('ai_credit_wallets')->where('user_id', $userId)->update([
                'reserved' => $wallet->reserved - $held,
                'available' => $wallet->available + $returned,
                'spent_lifetime' => $wallet->spent_lifetime + $charge,
                'version' => $wallet->version + 1, 'updated_at' => now(),
            ]);
        }
    }

    /** Compensating reversal: removes only unspent purchased credits, never creates negative funds. */
    public function revokePurchased(int $userId, string $orderUuid): bool
    {
        $wallet = $this->wallet($userId);
        $grant = DB::table('ai_credit_grants')->where('user_id', $userId)
            ->where('source', 'paid_package')->where('source_ref', 'order:'.$orderUuid)
            ->lockForUpdate()->first();
        if (! $grant) {
            throw new AiFailure('PURCHASE_GRANT_NOT_FOUND', 503);
        }
        if ($grant->available > 0) {
            if ($wallet->available < $grant->available) {
                throw new AiFailure('LEDGER_RECONCILIATION_REQUIRED', 503);
            }
            DB::table('ai_credit_grants')->where('id', $grant->id)->update([
                'available' => 0, 'expired' => $grant->expired + $grant->available,
                'updated_at' => now(),
            ]);
            DB::table('ai_credit_wallets')->where('user_id', $userId)->update([
                'available' => $wallet->available - $grant->available,
                'version' => $wallet->version + 1, 'updated_at' => now(),
            ]);
            $this->event($userId, $grant->id, null, 'chargeback_revoke',
                -$grant->available, 0, 0, "grant:{$grant->id}:chargeback_revoke");
        }
        // Outstanding holds/spent credits require manual receivable review, not a negative wallet.
        return $grant->reserved === 0 && $grant->consumed === 0;
    }

    public function expire(int $limit = 200): int
    {
        $ids = DB::table('ai_credit_grants')->where('available', '>', 0)
            ->whereNotNull('expires_at')->where('expires_at', '<=', now())
            ->orderBy('id')->limit($limit)->pluck('id');
        $expired = 0;
        foreach ($ids as $id) {
            DB::transaction(function () use ($id, &$expired): void {
                $grant = DB::table('ai_credit_grants')->where('id', $id)->first();
                if (! $grant) {
                    return;
                }
                $wallet = $this->wallet($grant->user_id);
                $grant = DB::table('ai_credit_grants')->where('id', $id)->lockForUpdate()->first();
                if ($grant->available < 1 || ! $grant->expires_at ||
                    \Illuminate\Support\Carbon::parse($grant->expires_at)->isFuture()) {
                    return;
                }
                DB::table('ai_credit_grants')->where('id', $id)->update([
                    'available' => 0, 'expired' => $grant->expired + $grant->available, 'updated_at' => now(),
                ]);
                DB::table('ai_credit_wallets')->where('user_id', $grant->user_id)->update([
                    'available' => $wallet->available - $grant->available,
                    'version' => $wallet->version + 1, 'updated_at' => now(),
                ]);
                $this->event($grant->user_id, $id, null, 'expire', -$grant->available, 0, 0,
                    "grant:{$id}:expire");
                $expired++;
            }, 3);
        }
        return $expired;
    }

    private function event(int $userId, ?int $grantId, ?int $requestId, string $kind,
        int $available, int $reserved, int $consumed, string $reference): void
    {
        DB::table('ai_credit_ledger')->insert([
            'user_id' => $userId, 'grant_id' => $grantId, 'request_id' => $requestId,
            'kind' => $kind, 'available_delta' => $available, 'reserved_delta' => $reserved,
            'consumed_delta' => $consumed, 'event_ref' => $reference, 'created_at' => now(),
        ]);
    }
}
