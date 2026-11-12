<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Community\Queries\FeedQuery;
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
        $completion = $filled * 20;

        $feed ??= app(FeedQuery::class);
        $feedPage = $feed->page($feedTab, 'All', null, $user, null, true);
        $dashboardPosts = $feed->dashboardPosts($feedPage['data']);
        $stats = app(MemberDashboardStats::class)->forMember($user);

        return [
            'dashboard' => [
                'plan' => $plan,
                'isDemo' => $isDemo,
                'isPreview' => $preview,
                'member' => ['id' => $user->getKey(), 'name' => $user->name, 'role' => $profile?->role, 'avatar_path' => $profile?->avatar_path, 'completion' => $completion],
                'scenario' => null,
                'learning' => $stats['learning'],
                'overview' => $stats['overview'],
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
