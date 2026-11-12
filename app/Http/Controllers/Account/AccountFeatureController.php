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
        if ($feature === 'interview') {
            return to_route('interview.index');
        }
        if ($feature === 'pmp') {
            return to_route('exams.pmp.index');
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
            $completed = DB::table('learning_activity_completions')->where('user_id', $user->id)->count();
            $paths = DB::table('learning_paths')->where('is_published', true)->select('id', 'title', 'slug')->get();
            $counts = DB::table('learning_activity_completions as lac')
                ->join('learning_activities as la', 'lac.learning_activity_id', '=', 'la.id')
                ->join('learning_modules as lm', 'la.learning_module_id', '=', 'lm.id')
                ->where('lac.user_id', $user->id)
                ->groupBy('lm.learning_path_id')
                ->select('lm.learning_path_id', DB::raw('COUNT(*) as total'))->pluck('total', 'learning_path_id');
            $pathSummaries = $paths->map(fn ($path) => ['id' => $path->id, 'title' => $path->title,
                'slug' => $path->slug, 'completedActivities' => (int) ($counts[$path->id] ?? 0)])->values();
            $badges = [];
            if (DB::table('posts')->where('author_id', $user->id)->where('status', 'published')->whereNull('deleted_at')->exists()) {
                $badges[] = ['key' => 'first-post', 'label' => 'First post'];
            }
            if (DB::table('comments')->where('author_id', $user->id)->whereNull('deleted_at')->exists()) {
                $badges[] = ['key' => 'first-reply', 'label' => 'First reply'];
            }
            if (DB::table('scenario_responses')->where('user_id', $user->id)->exists()) {
                $badges[] = ['key' => 'first-scenario', 'label' => 'First scenario'];
            }
            return Inertia::render('account/Achievements', ['completedActivities' => $completed, 'paths' => $pathSummaries, 'badges' => $badges]);
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
