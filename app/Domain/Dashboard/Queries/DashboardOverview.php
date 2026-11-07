<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Community\Queries\FeedQuery;
use App\Models\Scenario;
use App\Models\User;
use App\Domain\Billing\Queries\CurrentMemberPlan;

/** Read-only, privacy-limited projection. Demo figures never grant entitlements. */
final class DashboardOverview
{
    public function forMember(User $user, ?string $previewPlan = null, string $feedTab = 'all', ?FeedQuery $feed = null): array
    {
        $user->loadMissing('profile');

        $isDemo = app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled');
        $plan = app(CurrentMemberPlan::class)->dashboardCode($user);
        $preview = $isDemo && in_array($previewPlan, ['free', 'premium', 'pro'], true);
        if ($preview) {
            $plan = $previewPlan;
        }

        $profile = $user->profile;
        $filled = collect([
            filled($user->name), filled($profile?->role), filled($profile?->years_experience),
            filled($profile?->headline), filled($profile?->bio),
        ])->filter()->count();
        $completion = $isDemo ? ($plan === 'free' ? 45 : 80) : $filled * 20;

        $feed ??= app(FeedQuery::class);
        $feedPage = $feed->page($feedTab, 'All', null, $user, null, true);
        $dashboardPosts = $feed->dashboardPosts($feedPage['data']);

        $scenario = Scenario::query()->where('status', 'published')
            ->latest('published_at')->first(['id', 'slug', 'title', 'summary']);

        return [
            'dashboard' => [
                'plan' => $plan,
                'isDemo' => $isDemo,
                'isPreview' => $preview,
                'member' => ['id' => $user->getKey(), 'name' => $user->name, 'role' => $profile?->role, 'avatar_path' => $profile?->avatar_path, 'completion' => $completion],
                'scenario' => $scenario,
                'learning' => $isDemo ? [
                    'time' => $plan === 'free' ? '1h 20m' : '8h 0m',
                    'scenarios' => $plan === 'free' ? 3 : 24,
                    'level' => $plan === 'free' ? 1 : 4,
                    'lessonProgress' => $plan === 'free' ? '2 / 6' : '3 / 5',
                ] : ['time' => '0h 0m', 'scenarios' => 0, 'level' => 1, 'lessonProgress' => '0 / 0'],
                'posts' => $dashboardPosts,
                'virtualFeedEnabled' => (bool) config('pm-circle.virtual_feed_enabled', true),
                'feedPage' => [
                    'next_cursor' => $feedPage['next_cursor'],
                    'has_more' => $feedPage['has_more'],
                ],
                'feedTab' => $feedTab,
            ],
        ];
    }
}
