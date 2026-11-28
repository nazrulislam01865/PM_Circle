<?php

namespace App\Domain\Dashboard\Queries;

use App\Domain\Community\Queries\FeedQuery;
use App\Domain\Community\Queries\PostCheckFeed;
use App\Domain\Community\Queries\FeedTabAvailability;
use App\Models\User;
use App\Domain\AI\Services\PmpAiUsageReadModel;
use App\Domain\Billing\Queries\CurrentMemberPlan;
use App\Domain\Billing\Queries\MemberFeatureAccess;
use App\Domain\Billing\Services\ProfileCompletionRewardService;
use App\Domain\Identity\Services\ProfileCompleteness;

/** Independent read paths; demo figures never grant entitlements. */
final class DashboardOverview
{
    public function identity(User $user, ?string $previewPlan, string $actualPlan): array
    {
        $user->loadMissing('profile');
        $isDemo = app()->environment(['local', 'testing']) && config('pm-circle.demo_content_enabled');
        $preview = $isDemo && in_array($previewPlan, ['free', 'premium', 'pro'], true);
        $plan = $preview ? $previewPlan : ($actualPlan === 'plus' ? 'premium' : $actualPlan);
        $profile = $user->profile;
        $scores = app(ProfileCompleteness::class)->scores($user);

        return [
            'plan' => $plan, 'isDemo' => $isDemo, 'isPreview' => $preview,
            'featureAccess' => app(MemberFeatureAccess::class)->forPlan($actualPlan),
            'member' => ['id' => $user->getKey(), 'name' => $user->name, 'role' => $profile?->role,
                'avatar_path' => $profile?->avatar_path, 'completion' => $scores['profile']],
            'reward' => app(ProfileCompletionRewardService::class)->forMember($user, $scores['core']),
            'scenario' => null,
            'virtualFeedEnabled' => (bool) config('pm-circle.virtual_feed_enabled', true),
            'boundedFeedEnabled' => (bool) config('community.bounded_feed_enabled'),
        ];
    }

    public function feed(User $user, string $tab, ?FeedQuery $feed = null): array
    {
        $feed ??= app(FeedQuery::class);
        $page = $feed->page($tab, 'All', null, $user, null, true);
        return [
            'posts' => $feed->dashboardPosts($page['data']),
            'feedPage' => ['next_cursor' => $page['next_cursor'], 'previous_cursor' => $page['previous_cursor'], 'has_more' => $page['has_more']],
            'feedTab' => $tab,
        ];
    }

    public function checks(User $user): array
    {
        return app(PostCheckFeed::class)->forMember($user->id);
    }

    public function scopeCounts(User $user): array
    {
        return app(FeedTabAvailability::class)->forViewer($user);
    }

    public function planUsage(User $user, string $actualPlan): array
    {
        $examAccess = MemberFeatureAccess::allowsExamSimulator($actualPlan);
        $tokens = $examAccess ? app(PmpAiUsageReadModel::class)->summary($user, includeActivity: false) : ['configured' => false];
        return ['plan' => $actualPlan, 'examAccess' => $examAccess,
            'tokensRemaining' => $tokens['configured'] && ($tokens['allocated'] ?? 0) > 0 ? (int) $tokens['remaining'] : null];
    }

    public function statistics(User $user, ?string $plan = null): array
    {
        return app(MemberDashboardStats::class)->forMember($user, $plan);
    }

    /** Compatibility path for phased rollout and existing callers. */
    public function forMember(User $user, ?string $previewPlan = null, string $feedTab = 'all', ?FeedQuery $feed = null): array
    {
        $actualPlan = app(CurrentMemberPlan::class)->code($user);
        $checks = $this->checks($user);
        return ['dashboard' => [
            ...$this->identity($user, $previewPlan, $actualPlan),
            ...$this->feed($user, $feedTab, $feed),
            ...$this->statistics($user, $actualPlan),
            'planUsage' => $this->planUsage($user, $actualPlan),
            'postChecks' => $checks,
            'feedScopeCounts' => [...$this->scopeCounts($user), 'restricted' => $checks['restricted_count']],
        ]];
    }
}
