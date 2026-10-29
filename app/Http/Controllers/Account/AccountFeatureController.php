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
            return Inertia::render('account/Achievements', ['completedActivities' => $completed, 'paths' => $pathSummaries]);
        }
        if ($feature === 'insights') {
            return Inertia::render('account/Insights', [
                'publicPosts' => $user->posts()->where('status', 'published')->where('visibility', 'public')->count(),
                'savedPosts' => DB::table('post_saves')->where('user_id', $user->id)->count(),
                'completedActivities' => DB::table('learning_activity_completions')->where('user_id', $user->id)->count(),
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
