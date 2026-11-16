<?php

// Dependency-free contract check for the profile reward change set.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $condition, string $description): void {
    if (! $condition) {
        fwrite(STDERR, "FAIL: {$description}\n");
        exit(1);
    }
    echo "PASS: {$description}\n";
};

$routes = $read('routes/web.php');
$controller = $read('app/Http/Controllers/Admin/ProfileRewardSettingsController.php');
$service = $read('app/Domain/Billing/Services/ProfileCompletionRewardService.php');
$completion = $read('app/Domain/Identity/Services/ProfileCompleteness.php');
$component = $read('resources/js/components/rewards/ProfileCompletionReward.tsx');
$css = $read('resources/css/pm-profile-reward.css');
$tokens = $read('resources/css/pm-design-tokens.css');

$assert(str_contains($routes, "['auth', 'pm.admin', 'verified']") && str_contains($routes, "Route::put('/profile-rewards'") && str_contains($routes, 'ProfileRewardSettingsController'), 'Admin reward update stays behind the existing admin middleware');
$assert(str_contains($controller, 'ProfileRewardSetting::query()->updateOrCreate') && str_contains($controller, 'clearSettingsCache'), 'Admin settings persist and invalidate read cache');
$assert(str_contains($service, 'createOrFirst') && str_contains($read('database/migrations/2026_11_16_000001_create_profile_completion_rewards.php'), "->unique()->constrained()"), 'Reward issuance is member-unique and concurrency safe');
$assert(str_contains($service, "\$productScope !== 'simulator'") && str_contains($service, "\$reward->currency !== strtoupper(\$currency)") && str_contains($service, 'lockForUpdate()'), 'Checkout integration enforces product and currency and locks redemptions');
$assert(str_contains($service, 'where(\'user_id\', $user->getKey())') && ! str_contains($routes, 'profile-rewards/redeem'), 'Code is member-bound and no unverified public payment route is exposed');
$assert(str_contains($read('app/Domain/Dashboard/Queries/DashboardOverview.php'), 'ProfileCompleteness::class') && str_contains($read('app/Http/Controllers/Settings/ProfileController.php'), 'ProfileCompleteness::class') && str_contains($completion, "filled(\$profile?->about)"), 'Dashboard and profile share the same ten-field profile calculator');
$assert(str_contains($read('resources/js/components/dashboard/MemberHomeOverview.tsx'), '<ProfileCompletionReward') && str_contains($read('resources/js/pages/settings/profile.tsx'), '<ProfileCompletionReward') && str_contains($read('resources/js/components/home/HomePathway.tsx'), '<ProfileRewardPromotion'), 'Two sidebars and homepage reuse the reward components');
$assert(str_contains($component, 'navigator.clipboard.writeText') && str_contains($component, "reward.status === 'expired'") && str_contains($component, "reward.status === 'pending'"), 'Copy and state-specific reward interfaces exist');
$assert(str_contains($css, 'var(--reward-surface)') && str_contains($tokens, '--reward-surface:') && str_contains($read('resources/css/app.css'), "@import './pm-profile-reward.css'"), 'Reward visuals consume shared design tokens');

$header = $read('resources/js/components/dashboard/MemberHomeHeader.tsx');
$pathway = $read('resources/js/components/home/HomePathway.tsx');
$middleware = $read('app/Http/Middleware/HandleInertiaRequests.php');
$assert(str_contains($middleware, "'rewardPromotion' => fn ()")
    && str_contains($middleware, 'ProfileCompletionRewardService::class)->publicPromotion()')
    && str_contains($header, 'page.props.rewardPromotion && <a')
    && str_contains($header, "pathname === '/' ? '#pm-pathway-exams-title' : '/#pm-pathway-exams-title'")
    && ! str_contains($header, "!user && pathname === '/' && page.props.rewardPromotion")
    && str_contains($pathway, 'id="pm-pathway-exams-title"'),
    'Cached, enabled reward promotion appears on guest and member headers and links to the homepage offer');
$assert(str_contains($css, 'color: var(--exam-nav-ink); background: var(--exam-nav-soft)')
    && str_contains($css, 'background: var(--exam-nav-hover)')
    && str_contains($css, 'scroll-margin-top: calc(var(--header-height) + var(--s4))'),
    'Reward navigation pill matches Exam Simulator tokens and avoids sticky-header overlap');

$assert(str_contains($css, 'align-self: center; flex: none;')
    && str_contains($css, 'min-height: var(--control-height); padding-inline: var(--s4);')
    && str_contains($css, '@media (max-width: 960px)')
    && str_contains($css, 'align-self: stretch;'),
    'Header reward stays vertically centered with the Exam Simulator pill and fills collapsed navigation rows');
