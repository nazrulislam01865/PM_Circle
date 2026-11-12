<?php

namespace App\Domain\Dashboard\Queries;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Small aggregate-only projection for the member homepage; no demo statistics. */
final class MemberDashboardStats
{
    public function forMember(User $user): array
    {
        $userId = $user->getKey();
        $posts = DB::table('posts')->where('author_id', $userId)
            ->where('status', 'published')->whereNull('deleted_at')->count();
        $replies = DB::table('comments')->where('author_id', $userId)
            ->whereNull('deleted_at')->count();
        $responses = DB::table('scenario_responses')->where('user_id', $userId)->count();
        $scenarios = DB::table('scenario_responses')->where('user_id', $userId)->distinct()->count('scenario_id');
        $activities = DB::table('learning_activity_completions')->where('user_id', $userId)->count();

        $attempts = DB::table('pmp_exam_attempts')->where('user_id', $userId);
        $latestAttempt = (clone $attempts)->latest('id')->value('status');

        // Measured PMP practice time only; never present course estimates as elapsed time.
        $driver = DB::connection()->getDriverName();
        $timeExpression = $driver === 'pgsql'
            ? 'COALESCE(SUM(GREATEST(0, LEAST(EXTRACT(EPOCH FROM (finished_at - started_at)), 14400))), 0)'
            : "COALESCE(SUM(MAX(0, MIN((julianday(finished_at) - julianday(started_at)) * 86400, 14400))), 0)";
        $seconds = (int) (clone $attempts)->where('status', 'completed')
            ->whereNotNull('finished_at')->selectRaw($timeExpression.' AS elapsed')->first()?->elapsed;
        $minutes = (int) floor(max(0, $seconds) / 60);

        $views = DB::table('member_profile_views')->where('profile_user_id', $userId)
            ->where('viewed_on', '>=', now()->subDays(29)->toDateString())
            ->selectRaw('COUNT(*) AS last_30')
            ->selectRaw('SUM(CASE WHEN viewed_on >= ? THEN 1 ELSE 0 END) AS this_week', [now()->subDays(6)->toDateString()])
            ->first();

        // Activity milestones are computed from actual published posts/replies/responses.
        // They are not third-party certifications or administrative badge grants.
        $badges = [];
        if ($posts > 0) $badges[] = ['key' => 'first-post', 'label' => 'First post'];
        if ($replies > 0) $badges[] = ['key' => 'first-reply', 'label' => 'First reply'];
        if ($responses > 0) $badges[] = ['key' => 'first-scenario', 'label' => 'First scenario'];

        return [
            'learning' => [
                'time' => intdiv($minutes, 60).'h '.($minutes % 60).'m',
                'scenarios' => (int) $scenarios,
                'level' => 1, // No issued level progression exists in the current learning model.
                'lessonProgress' => $activities.' completed',
            ],
            'overview' => [
                'badges' => $badges,
                'insights' => ['last30' => (int) ($views->last_30 ?? 0), 'thisWeek' => (int) ($views->this_week ?? 0)],
                'contribution' => ['posts' => (int) $posts, 'replies' => (int) $replies, 'responses' => (int) $responses],
                'syllabus' => ['name' => 'PMP exam syllabus', 'status' => match ($latestAttempt) {
                    'completed' => 'Practised', 'in_progress' => 'In progress', default => 'Not started',
                }],
            ],
        ];
    }
}
