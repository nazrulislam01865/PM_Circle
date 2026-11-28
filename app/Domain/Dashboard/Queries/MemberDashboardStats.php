<?php

namespace App\Domain\Dashboard\Queries;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Small aggregate-only projection for the member homepage; no demo statistics. */
final class MemberDashboardStats
{
    public function forMember(User $user, ?string $plan = null): array
    {
        $userId = $user->getKey();
        $paid = \App\Domain\Billing\Queries\MemberFeatureAccess::allows($plan ?? app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($user), 'plus');
        $achievement = app(\App\Domain\Achievements\Queries\MemberAchievements::class)->snapshot($user, includeRecord: false, issueAwards: $paid);
        $posts = $achievement['metrics']['posts'];
        $replies = $achievement['metrics']['replies'];
        $responses = DB::table('scenario_responses')->where('user_id', $userId)->count();
        $scenarios = DB::table('scenario_responses')->where('user_id', $userId)->distinct()->count('scenario_id');
        $activities = DB::table('learning_activity_completions')->where('user_id', $userId)->count();

        $minutes = $achievement['metrics']['minutes'];

        $views = $paid ? DB::table('member_profile_views')->where('profile_user_id', $userId)
            ->where('viewed_on', '>=', now()->subDays(29)->toDateString())
            ->selectRaw('COUNT(*) AS last_30')
            ->selectRaw('SUM(CASE WHEN viewed_on >= ? THEN 1 ELSE 0 END) AS this_week', [now()->subDays(6)->toDateString()])
            ->first() : null;

        return [
            'learning' => [
                'time' => intdiv($minutes, 60).'h '.($minutes % 60).'m',
                'minutes' => $minutes, 'completedActivities' => (int) $activities,
                'scenarios' => (int) $scenarios,
                'level' => 1, // No issued level progression exists in the current learning model.
                'lessonProgress' => $activities.' completed',
            ],
            'overview' => [
                'badges' => $paid ? $achievement['latest'] : [],
                'badgeCount' => $paid ? count(array_filter($achievement['badges'], fn ($badge) => $badge['status'] === 'earned')) : 0,
                'insights' => ['last30' => (int) ($views->last_30 ?? 0), 'thisWeek' => (int) ($views->this_week ?? 0)],
                'contribution' => ['posts' => (int) $posts, 'replies' => (int) $replies, 'responses' => (int) $responses],
            ],
        ];
    }
}
