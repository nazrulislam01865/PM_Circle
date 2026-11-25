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
        $achievement = app(\App\Domain\Achievements\Queries\MemberAchievements::class)->snapshot($user, includeRecord: false);
        $posts = $achievement['metrics']['posts'];
        $replies = $achievement['metrics']['replies'];
        $responses = DB::table('scenario_responses')->where('user_id', $userId)->count();
        $scenarios = DB::table('scenario_responses')->where('user_id', $userId)->distinct()->count('scenario_id');
        $activities = DB::table('learning_activity_completions')->where('user_id', $userId)->count();

        $attempts = DB::table('pmp_exam_attempts')->where('user_id', $userId);
        $latestAttempt = (clone $attempts)->latest('id')->value('status');

        $minutes = $achievement['metrics']['minutes'];

        $views = DB::table('member_profile_views')->where('profile_user_id', $userId)
            ->where('viewed_on', '>=', now()->subDays(29)->toDateString())
            ->selectRaw('COUNT(*) AS last_30')
            ->selectRaw('SUM(CASE WHEN viewed_on >= ? THEN 1 ELSE 0 END) AS this_week', [now()->subDays(6)->toDateString()])
            ->first();

        return [
            'learning' => [
                'time' => intdiv($minutes, 60).'h '.($minutes % 60).'m',
                'minutes' => $minutes, 'completedActivities' => (int) $activities,
                'scenarios' => (int) $scenarios,
                'level' => 1, // No issued level progression exists in the current learning model.
                'lessonProgress' => $activities.' completed',
            ],
            'overview' => [
                'badges' => $achievement['latest'],
                'badgeCount' => count(array_filter($achievement['badges'], fn ($badge) => $badge['status'] === 'earned')),
                'insights' => ['last30' => (int) ($views->last_30 ?? 0), 'thisWeek' => (int) ($views->this_week ?? 0)],
                'contribution' => ['posts' => (int) $posts, 'replies' => (int) $replies, 'responses' => (int) $responses],
                'syllabus' => ['name' => 'PMP exam syllabus', 'status' => match ($latestAttempt) {
                    'completed' => 'Practised', 'in_progress' => 'In progress', default => 'Not started',
                }],
            ],
        ];
    }
}
