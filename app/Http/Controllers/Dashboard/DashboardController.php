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
            'tab' => ['nullable', 'in:all,for-you,following,mine'],
        ]);

        return Inertia::render('account/Dashboard', [
            ...$overview->forMember(
                $request->user(),
                $validated['demo_plan'] ?? null,
                ($validated['tab'] ?? 'all') === 'for-you' ? 'all' : ($validated['tab'] ?? 'all'),
            ),
            'flashStatus' => $request->session()->get('status'),
        ]);
    }
}
