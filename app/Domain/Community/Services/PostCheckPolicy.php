<?php

namespace App\Domain\Community\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Enforces author restrictions for posts, comments and replies server-side. */
final class PostCheckPolicy
{
    public function restrictionUntil(int $userId): ?string
    {
        $until = DB::table('post_check_restrictions')->where('user_id', $userId)->value('blocked_until');

        return $until && \Illuminate\Support\Carbon::parse($until)->isFuture() ? (string) $until : null;
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

    /** Called while holding a post lock after a confirmed AI restriction. */
    public function recordViolation(int $postId, int $version, int $userId, string $category): void
    {
        $inserted = DB::table('post_check_violations')->insertOrIgnore([
            'post_id' => $postId, 'check_version' => $version,
            'user_id' => $userId, 'category' => $category, 'created_at' => now(),
        ]);
        if ($inserted) $this->applyRestrictionIfDue($userId);
    }

    /** Called while holding a comment lock; duplicate queue executions cannot add strikes. */
    public function recordCommentViolation(int $commentId, int $userId, string $category): void
    {
        $inserted = DB::table('comment_check_violations')->insertOrIgnore([
            'comment_id' => $commentId, 'user_id' => $userId,
            'category' => $category, 'created_at' => now(),
        ]);
        if ($inserted) $this->applyRestrictionIfDue($userId);
    }

    private function applyRestrictionIfDue(int $userId): void
    {
        $start = now()->subDays(30);
        $count = DB::table('post_check_violations')->where('user_id', $userId)
            ->where('created_at', '>=', $start)->count()
            + DB::table('comment_check_violations')->where('user_id', $userId)
                ->where('created_at', '>=', $start)->count();
        if ($count < 5) return;

        // Never shorten an existing restriction when another violation is recorded.
        $existing = DB::table('post_check_restrictions')->where('user_id', $userId)->value('blocked_until');
        $until = now()->addDays(10);
        if ($existing && \Illuminate\Support\Carbon::parse($existing)->greaterThan($until)) {
            $until = \Illuminate\Support\Carbon::parse($existing);
        }
        DB::table('post_check_restrictions')->upsert([
            ['user_id' => $userId, 'blocked_until' => $until, 'created_at' => now(), 'updated_at' => now()],
        ], ['user_id'], ['blocked_until', 'updated_at']);
    }
}
