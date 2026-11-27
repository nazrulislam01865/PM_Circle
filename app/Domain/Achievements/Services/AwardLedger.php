<?php

namespace App\Domain\Achievements\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

final class AwardLedger
{
    /** Only verified projections can issue an award. Existing snapshots survive rule edits. */
    public function reconcile(User $user, array $badges, bool $issue = true): array
    {
        $existing = DB::table('achievement_awards')->where('user_id', $user->id)->get()->keyBy('badge_id');
        $pending = array_filter($badges, fn ($badge) => $badge['publishStatus'] === 'active' && $badge['status'] === 'earned' && ! $existing->has($badge['id']));
        if ($issue && $pending !== []) {
            DB::transaction(function () use ($user, $pending): void {
                $current = DB::table('achievement_badges')->whereIn('id', array_column($pending, 'id'))->orderBy('id')->sharedLock()->get()->keyBy('id');
                $rows = [];
                foreach ($pending as $badge) {
                    $row = $current->get($badge['id']);
                    if (! $row || $row->status !== 'active' || (int) $row->version !== $badge['version']) continue;
                    $rows[] = ['user_id' => $user->id, 'badge_id' => $badge['id'], 'snapshot' => json_encode($badge, JSON_THROW_ON_ERROR), 'earned_at' => $badge['earnedAt'] ? \Illuminate\Support\Carbon::parse($badge['earnedAt']) : null, 'created_at' => now()];
                }
                if ($rows !== []) DB::table('achievement_awards')->insertOrIgnore($rows);
            });
            $existing = DB::table('achievement_awards')->where('user_id', $user->id)->get()->keyBy('badge_id');
        }
        $result = [];
        foreach ($badges as $badge) {
            $award = $existing->get($badge['id']);
            if ($award && $award->revoked_at === null) {
                $snapshot = json_decode($award->snapshot, true, 512, JSON_THROW_ON_ERROR);
                $snapshot['artworkUrl'] = empty($snapshot['artwork']) ? null : \Illuminate\Support\Facades\Storage::disk('public')->url($snapshot['artwork']);
                $result[] = [...$snapshot, 'publishStatus' => $badge['publishStatus'],
                    'awardOrderAt' => \Illuminate\Support\Carbon::parse($award->earned_at ?? $award->created_at)->getTimestamp(), 'awardOrderId' => (int) $award->id];
            } elseif (in_array($badge['publishStatus'], ['active', 'paused'], true)) {
                // An explicit revocation cannot be undone by revisiting a page.
                if ($award || $badge['publishStatus'] !== 'active' || ($issue && $badge['status'] === 'earned')) {
                    $badge = [...$badge, 'status' => 'locked', 'earnedAt' => null, 'available' => false, 'value' => 0];
                }
                $result[] = $badge;
            }
        }
        return $result;
    }
}
