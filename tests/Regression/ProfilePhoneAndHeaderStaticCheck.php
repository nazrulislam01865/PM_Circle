<?php

// Dependency-free checks for the shared reward header, required phone and footer-safe save bar.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $passed, string $label): void {
    if (! $passed) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
};

$header = $read('resources/js/components/dashboard/MemberHomeHeader.tsx');
$shared = $read('app/Http/Middleware/HandleInertiaRequests.php');
$home = $read('app/Http/Controllers/PublicSite/HomeController.php');
$rewardCss = $read('resources/css/pm-profile-reward.css');
$assert(str_contains($shared, "'rewardPromotion' => fn ()")
    && str_contains($shared, 'ProfileCompletionRewardService::class)->publicPromotion()'), 'Header promotion shared from the existing cached reward settings');
$assert(str_contains($header, 'page.props.rewardPromotion && <a')
    && ! str_contains($header, "!user && pathname === '/' && page.props.rewardPromotion")
    && str_contains($header, "pathname === '/' ? '#pm-pathway-exams-title' : '/#pm-pathway-exams-title'"),
    'Guest and signed-in member headers link to the actual homepage offer section');
$assert(! str_contains($home, "'rewardPromotion' =>")
    && str_contains($shared, "'rewardPromotion' => fn ()"),
    'Only one shared reward payload is calculated; homepage does not override it');
$assert(str_contains($rewardCss, '@media (max-width: 960px)')
    && ! str_contains($rewardCss, '@media (max-width: 1400px)'),
    'Reward pill is centered on desktop and row-aligned only inside collapsed navigation');

$request = $read('app/Http/Requests/Settings/ProfileUpdateRequest.php');
$phone = $read('resources/js/components/profile/ProfilePhoneField.tsx');
$page = $read('resources/js/pages/settings/profile.tsx');
$assert(str_contains($request, 'Rule::requiredIf') && str_contains($request, "'phone' => [")
    && str_contains($request, "'tab') === 'edit'") && str_contains($request, "7 to 15 digits"),
    'Full profile updates require a valid phone on the server without blocking unrelated partial updates');
$assert(str_contains($phone, 'required aria-required="true"')
    && str_contains($phone, 'pm-profile-phone-error')
    && str_contains($page, 'formErrors.phone')
    && str_contains($page, "Phone number is required."),
    'Phone field has client validation, accessible errors and a required indicator');
$css = $read('resources/css/pm-profile-ux.css');
$assert(str_contains($css, 'position: sticky; bottom: var(--space-3)')
    && ! str_contains($css, 'position: fixed; bottom: var(--space-3)')
    && ! str_contains($css, 'left: calc(var(--pm-member-sidebar-width) + var(--pm-member-content-inset))'),
    'Profile actions stay in the page flow so they cannot cover the site footer');
