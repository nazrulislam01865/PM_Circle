<?php

namespace App\Http\Controllers\Dashboard;

use App\Domain\Dashboard\Queries\DashboardOverview;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardOverview $overview): Response|RedirectResponse
    {
        if ($request->user()->onboarding_step < 3) {
            return to_route('join.profile');
        }

        $validated = $request->validate([
            'demo_plan' => ['nullable', 'in:free,premium,pro'],
            'tab' => ['nullable', 'in:all,for-you,following,mine,saved,hidden,restricted'],
        ]);

        $user = $request->user();
        $tab = ($validated['tab'] ?? 'all') === 'for-you' ? 'all' : ($validated['tab'] ?? 'all');
        if (config('community.progressive_dashboard_enabled')) {
            // Memoize the plan only within this request, and only if needed.
            $actualPlan = null;
            $plan = function () use ($user, &$actualPlan): string {
                return $actualPlan ??= app(\App\Domain\Billing\Queries\CurrentMemberPlan::class)->code($user);
            };
            return Inertia::render('account/Dashboard', [
                'dashboard' => fn () => $overview->identity($user, $validated['demo_plan'] ?? null, $plan()),
                'feed' => fn () => $overview->feed($user, $tab),
                'postChecks' => fn () => $overview->checks($user),
                'feedScopeCounts' => fn () => $overview->scopeCounts($user),
                'statistics' => Inertia::defer(fn () => $this->displaySummary(fn () => $overview->statistics($user)), 'dashboard-summary'),
                'planUsage' => Inertia::defer(fn () => $this->displaySummary(fn () => $overview->planUsage($user, $plan())), 'dashboard-summary'),
                'flashStatus' => fn () => $request->session()->get('status'),
            ]);
        }

        return Inertia::render('account/Dashboard', [
            ...$overview->forMember(
                $request->user(),
                $validated['demo_plan'] ?? null,
                ($validated['tab'] ?? 'all') === 'for-you' ? 'all' : ($validated['tab'] ?? 'all'),
            ),
            'flashStatus' => $request->session()->get('status'),
        ]);
    }
    private function displaySummary(callable $load): ?array
    {
        try {
            return $load();
        } catch (\Throwable $exception) {
            report($exception);
            return null;
        }
    }
}
