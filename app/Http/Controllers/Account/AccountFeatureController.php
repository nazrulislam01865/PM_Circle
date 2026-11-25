<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class AccountFeatureController extends Controller
{
    public function __invoke(Request $request, string $feature): Response|RedirectResponse
    {
        $user = $request->user();
        if ($feature === 'resume') {
            return to_route('member.resume-assistant');
        }
        if ($feature === 'interview') {
            return to_route('interview.index');
        }
        if ($feature === 'pmp') {
            return to_route('exams.pmp.index');
        }
        if ($feature === 'scrum') {
            return to_route('exams.scrum.index');
        }
        if ($feature === 'saved') {
            return to_route('saved-posts.index');
        }
        if ($feature === 'public-profile') {
            return $user->profile()->where('visibility', 'public')->exists()
                ? to_route('members.show', ['member' => $user->id])
                : to_route('profile.edit');
        }
        if ($feature === 'notifications') {
            return Inertia::render('account/Notifications');
        }
        if ($feature === 'achievements') {
            if ($user->onboarding_step < 3) {
                return to_route('join.profile');
            }
            $snapshot = app(\App\Domain\Achievements\Queries\MemberAchievements::class)->snapshot($user);
            return Inertia::render('account/Achievements', [
                'snapshot' => $snapshot,
                'member' => ['name' => $user->name, 'role' => $user->profile?->role,
                    'location' => implode(', ', array_filter([$user->profile?->city, $user->profile?->country])),
                    'avatar' => $user->profile?->avatar_path],
            ]);
        }
        if ($feature === 'insights') {
            $profileViews = DB::table('member_profile_views')->where('profile_user_id', $user->id)
                ->where('viewed_on', '>=', now()->subDays(29)->toDateString())
                ->selectRaw('COUNT(*) AS last_30')
                ->selectRaw('SUM(CASE WHEN viewed_on >= ? THEN 1 ELSE 0 END) AS this_week', [now()->subDays(6)->toDateString()])
                ->first();
            return Inertia::render('account/Insights', [
                'publicPosts' => $user->posts()->where('status', 'published')->where('visibility', 'public')->count(),
                'savedPosts' => DB::table('post_saves')->where('user_id', $user->id)->count(),
                'replies' => DB::table('comments')->where('author_id', $user->id)->whereNull('deleted_at')->count(),
                'scenarioResponses' => DB::table('scenario_responses')->where('user_id', $user->id)->count(),
                'completedActivities' => DB::table('learning_activity_completions')->where('user_id', $user->id)->count(),
                'profileViews' => ['last30' => (int) ($profileViews->last_30 ?? 0), 'thisWeek' => (int) ($profileViews->this_week ?? 0)],
            ]);
        }
        $titles = [
            'pmp' => 'PMP Exam Simulator', 'scrum' => 'Scrum / CSM Simulator',
            'simulations' => 'Project Simulator', 'resume' => 'Resume tools',
            'interview' => 'Interview practice', 'career' => 'Career tools',
        ];
        abort_unless(array_key_exists($feature, $titles), 404);
        return Inertia::render('public/ComingSoon', ['title' => $titles[$feature]]);
    }
}
