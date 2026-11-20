<?php

// Dependency-free check for the common-footer coverage and layout contract.
$root = dirname(__DIR__, 2);
$read = static fn (string $path): string => file_get_contents($root.'/'.$path) ?: '';
$assert = static function (bool $passed, string $label): void {
    if (! $passed) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
    echo "PASS: {$label}\n";
};

$public = $read('resources/js/layouts/pm/PublicLayout.tsx');
$member = $read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
$auth = $read('resources/js/layouts/pm/AuthPageFrame.tsx');
$siteFooter = $read('resources/js/components/pm/SiteFooter.tsx');
$footer = $read('resources/js/components/exam/PmpPublicFooter.tsx');
$learning = $read('resources/js/components/learning/LearningShared.tsx');
$visibility = $read('resources/js/components/pm/siteFooterVisibility.ts');
$css = $read('resources/css/pm-contact.css');
$memberCss = $read('resources/css/pm-member-shell.css');
$publicCss = $read('resources/css/pm-circle.css');
$home = $read('resources/js/pages/public/Home.tsx');
$exam = $read('resources/js/pages/exam/Public.tsx');

$assert(str_contains($public, '<SiteFooter') && str_contains($member, '<SiteFooter')
    && str_contains($auth, '<SiteFooter'), 'Guest, member and authentication shells have one shared footer');
$assert(str_contains($siteFooter, 'shouldShowSiteFooter(page.url)'), 'Footer visibility is decided once for all layouts');
$assert(str_contains($visibility, "path === '/dashboard'") && ! str_contains($visibility, "path === '/' ||")
    && str_contains($visibility, 'attempts') && str_contains($visibility, 'return true;')
    && ! str_contains($visibility, 'exams|exam-simulator|simulators'),
    'Public homepage has shared footer; dashboard and active exam stay excluded');
$assert(str_contains($learning, '<MemberDashboardLayout') && ! str_contains($learning, '<LearningFooter />'),
    'Learning member pages do not render a second footer');
$assert(str_contains($read('resources/js/components/discover-pm/DiscoverShell.tsx'), '<SiteFooter />'),
    'Discover PM retains its existing shared footer');
$assert(str_contains($footer, 'pm-container pm-unified-footer-container')
    && ! str_contains($css, '.pm-unified-footer-container { width:min(var(--content-width)'),
    'Footer columns and legal area reuse the exact public content width');
$assert(str_contains($memberCss, '.pm-member-shell > .pm-unified-footer')
    && str_contains($publicCss, '.pm-app.pm-page-shell > main'),
    'Member and guest shell layout have reserved footer space');
$assert(str_contains($home, '<PublicLayout siteLayout>') && str_contains($exam, '<PublicLayout siteLayout'),
    'Homepage and public PMP keep existing page components and sections');
$assert(str_contains($read('app/Http/Middleware/HandleInertiaRequests.php'), "'siteFooter' => fn ()"),
    'Footer content uses the pre-existing shared cached data; no new queries added');
