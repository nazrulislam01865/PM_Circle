<?php

namespace App\Domain\Community\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Shared, server-side restriction policy for community contributions. */
final class PostCheckPolicy
{
    /** The numbers are configurable without changing the moderation or UI code. */
    public function settings(): array
    {
        return [
            'threshold' => max(1, (int) config('community.post_restriction_threshold', 5)),
            'window_days' => max(1, (int) config('community.post_restriction_window_days', 30)),
            'duration_days' => max(1, (int) config('community.post_restriction_duration_days', 10)),
        ];
    }

    public function restrictionUntil(int $userId): ?string
    {
        $until = DB::table('post_check_restrictions')->where('user_id', $userId)->value('blocked_until');
        if (! $until) {
            return null;
        }

        $date = Carbon::parse($until);

        return $date->isFuture() ? $date->toIso8601String() : null;
    }

    public function assertOperational(): void
    {
        if (! config('pm-ai.enabled') || ! config('pm-ai.post_check_enabled')
            || ! filled(config('pm-ai.post_check_api_key'))
            || ! in_array(config('pm-ai.post_check_provider', 'responses'), ['responses', 'omni'], true)
            || (config('pm-ai.post_check_provider', 'responses') === 'responses'
                && ((float) config('pm-ai.post_check_daily_budget_usd', 0) < 0.02
                    || ! in_array(\App\Domain\AI\Services\PostContentCheckService::MODEL,
                        config('pm-ai.allowed_models', []), true)))) {
            throw ValidationException::withMessages([
                'body' => 'Post checking is temporarily unavailable. Please try again later.',
            ]);
        }
    }

    public function assertCanContribute(int $userId): void
    {
        if ($this->restrictionUntil($userId)) {
            throw ValidationException::withMessages([
                'body' => 'Posting, commenting and replying are paused during your posting restriction.',
            ]);
        }
    }

    /** The post version makes a retried queue job idempotent. */
    public function recordViolation(int $postId, int $version, int $userId, string $category): void
    {
        DB::transaction(function () use ($postId, $version, $userId, $category): void {
            $this->lockMember($userId);
            $inserted = DB::table('post_check_violations')->insertOrIgnore([
                'post_id' => $postId,
                'check_version' => $version,
                'user_id' => $userId,
                'category' => $category,
                'created_at' => now(),
            ]);
            if ($inserted) {
                $this->applyRestrictionIfDue($userId);
            }
        }, 3);
    }

    /** A comment/reply can receive only one confirmed strike, even on retries. */
    public function recordCommentViolation(int $commentId, int $userId, string $category): void
    {
        DB::transaction(function () use ($commentId, $userId, $category): void {
            $this->lockMember($userId);
            $inserted = DB::table('comment_check_violations')->insertOrIgnore([
                'comment_id' => $commentId,
                'user_id' => $userId,
                'category' => $category,
                'created_at' => now(),
            ]);
            if ($inserted) {
                $this->applyRestrictionIfDue($userId);
            }
        }, 3);
    }

    /** Serializes strikes belonging to the same member, across posts and comments. */
    private function lockMember(int $userId): void
    {
        DB::table('users')->where('id', $userId)->lockForUpdate()->first(['id']);
    }

    private function applyRestrictionIfDue(int $userId): void
    {
        $settings = $this->settings();
        $existing = DB::table('post_check_restrictions')
            ->where('user_id', $userId)->first(['blocked_until', 'updated_at']);

        // Additional queued violations must not keep moving an active ten-day deadline.
        if ($existing && Carbon::parse($existing->blocked_until)->isFuture()) {
            return;
        }

        $start = now()->subDays($settings['window_days']);
        if ($existing && Carbon::parse($existing->updated_at)->greaterThan($start)) {
            // Require a *new* set of confirmed strikes after a previous restriction.
            $start = Carbon::parse($existing->updated_at);
        }

        $posts = DB::table('post_check_violations')->where('user_id', $userId)
            ->where('created_at', '>', $start)->count();
        $comments = DB::table('comment_check_violations')->where('user_id', $userId)
            ->where('created_at', '>', $start)->count();

        if ($posts + $comments < $settings['threshold']) {
            return;
        }

        DB::table('post_check_restrictions')->upsert([[
            'user_id' => $userId,
            'blocked_until' => now()->addDays($settings['duration_days']),
            'created_at' => now(),
            'updated_at' => now(),
        ]], ['user_id'], ['blocked_until', 'updated_at']);
    }
}
