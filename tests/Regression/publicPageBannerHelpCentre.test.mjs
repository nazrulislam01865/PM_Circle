import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('the common public banner uses the approved simulator styles, semantic heading and breadcrumbs', () => {
    const banner = read('resources/js/components/pm/PublicPageBanner.tsx');
    const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
    const css = read('resources/css/pm-public-page-banner.css');
    assert.match(banner, /pm-sim-banner pm-public-page-banner/);
    assert.match(banner, /<nav className="pm-sim-breadcrumb" aria-label="Breadcrumb">/);
    assert.match(banner, /aria-current="page"/);
    assert.match(banner, /<h1 id=\{titleId\}>/);
    assert.match(layout, /isPublicView && banner && <PublicPageBanner/);
    assert.match(layout, /value=\{isPublicView && Boolean\(banner\)\}/);
    assert.match(banner, /usePublicPageBanner\(\) \? null/);
    assert.match(css, /var\(--pm-guide-text-h1\)/);
    assert.match(css, /var\(--pm-v2-container-width\)/);
    assert.doesNotMatch(css, /font-size:\s*\d|font-family:\s*["']|#[0-9a-f]{6}\b/i);
});

test('active public content routes use the common banner and retain original member headings', () => {
    for (const path of ['public/About','public/PolicyNotice','public/AiResumeAssistant','public/Support','public/Info','community/Feed','community/PostShow','members/Directory','members/Show','members/Unavailable','learning/Catalog','scenarios/Index','scenarios/Show','events/Index','events/Show','trends/Index','trends/Show','exam/Browse','exam/Public','public/Pricing']) {
        assert.match(read(`resources/js/pages/${path}.tsx`), /<PublicLayout[^\n]*banner=\{\{/, path);
    }
    assert.match(read('resources/js/components/pm/LegalPage.tsx'), /<PublicLayout[^\n]*banner=\{\{/);
    for (const path of ['learning/PublicCourseCatalog','learning/CourseWorkspace']) assert.match(read(`resources/js/components/${path}.tsx`), /<PublicLayout[^\n]*banner=\{\{/);
    assert.doesNotMatch(read('resources/js/pages/public/Home.tsx'), /banner=\{\{/);
    assert.doesNotMatch(read('resources/js/pages/learning/CourseShow.tsx'), /<PublicLayout[^\n]*banner=/);
    assert.match(read('resources/js/components/learning/CourseDetail.tsx'), /<h1 id="pm-course-detail-title">/);
});

test('guests reuse searchable Help Centre guides, with private support routes still member protected', () => {
    const controller = read('app/Http/Controllers/Account/SupportController.php');
    const page = read('resources/js/pages/support/HelpCentre.tsx');
    const routes = read('routes/web.php');
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    assert.match(controller, /Inertia::render\('support\/HelpCentre', \['publicView' => true\]\)/);
    assert.match(controller, /to_route\('support.guides'\)/);
    assert.match(page, /if \(!publicView\) return <AccountPage/);
    assert.match(page, /publicView \? '\/contact' : '\/help-center\/contact'/);
    assert.match(page, /publicView \? <Link[^>]+href="\/login">Log in to view support requests/);
    assert.match(page, /searchHelpGuides\(query, profileResumeImportsVisible\)/);
    assert.doesNotMatch(header, /help-center|Help Cent(?:re|er)/i);
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes("$link('Help Centre', '/help-center')"));
    assert.doesNotMatch(read('resources/css/pm-public-page-banner.css'), /help-center/);
    const protectedGroup = routes.slice(routes.lastIndexOf('Route::middleware(', routes.indexOf("Route::get('/help-center/guides'")), routes.indexOf("Route::post('/membership/temporary'"));
    assert.match(protectedGroup, /'auth'/);
    assert.match(protectedGroup, /Route::get\('\/help-center\/requests\/\{ticket\}'/);
    assert.match(controller, /where\('user_id', \$request->user\(\)->id\)/);
});

// Authentication and guided journeys keep the approved pre-banner layouts.
test('authentication and onboarding forms retain their original in-card headings without a public banner', () => {
    const frame = read('resources/js/layouts/pm/AuthPageFrame.tsx');
    const onboarding = read('resources/js/layouts/pm/OnboardingLayout.tsx');
    assert.doesNotMatch(frame, /PublicPageBanner|LegacyPageHeading|banner\??:/);
    assert.match(frame, /<main className="pm-auth-main">\s*\{children\}/);
    assert.doesNotMatch(onboarding, /PublicPageBanner|LegacyPageHeading|banner=/);
    assert.match(onboarding, /<div className="signup-intro">\s*<h1>\{title\}<\/h1>/);
    assert.match(onboarding, /signup-stepper/);
    for (const name of ['login','forgot-password','reset-password']) {
        const page = read(`resources/js/pages/auth/${name}.tsx`);
        assert.doesNotMatch(page, /PublicPageBanner|LegacyPageHeading|banner=/, name);
        assert.match(page, /<div className="pm-auth-intro">\s*<h1>/, name);
    }
    for (const step of [1,2,3]) {
        const page = read(`resources/js/pages/auth/RegisterStep${step}.tsx`);
        assert.match(page, new RegExp(`step=\\{${step}\\}`));
        assert.match(page, /<OnboardingLayout/);
        assert.doesNotMatch(page, /PublicPageBanner|LegacyPageHeading|banner=/);
    }
});

test('Discover PM flow retains its original card title and progress navigation', () => {
    const shell = read('resources/js/components/discover-pm/DiscoverShell.tsx');
    assert.doesNotMatch(shell, /PublicPageBanner|LegacyPageHeading/);
    assert.match(shell, /<h1 id="pm-discover-title">\{title\}<\/h1>/);
    assert.match(shell, /aria-label="Discover PM progress"/);
    assert.match(shell, /role="progressbar"/);
    assert.match(read('resources/css/pm-discover.css'), /\.pm-discover-card > h1\s*\{/);
});
