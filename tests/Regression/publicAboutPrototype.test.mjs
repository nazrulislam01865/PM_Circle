import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('About Us follows approved screenshot content, order and homepage shared shell', () => {
    const page = read('resources/js/pages/public/About.tsx');
    const route = read('routes/web.php');
    const publicLayout = read('resources/js/layouts/pm/PublicLayout.tsx');
    const defaults = read('app/Support/Admin/PublicPageContent.php');
    assert.match(route, /Route::get\('\/about', \[.*ContentPagesController::class, 'about'\]\)/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout banner=\{\{[^\n]*\}\}>/);
    assert.match(publicLayout, /<HomeHeader eventsVisible=\{homeEventsVisible\}\/>/);
    assert.match(publicLayout, /<SiteFooter pricingPrototype=/);
    assert.match(page, /<Head title=\{banner.title\}/);
    assert.match(page, /<nav className="pm-about-breadcrumb" aria-label="Breadcrumb">/);
    assert.match(page, /<h1 id="pm-about-title">\{banner.title\}<\/h1>/);
    assert.match(defaults, /Learn, practise and connect with people who manage projects\./);
    for (const copy of ['Built around real project work', 'What you can do on PM Circle', 'Developed by ITQAN Consulting', 'Visit ITQAN Consulting']) assert.ok(defaults.includes(copy));
    assert.ok(page.indexOf('intro.enabled') < page.indexOf('features.enabled'));
    assert.ok(page.indexOf('features.enabled') < page.indexOf('company.enabled'));
    assert.match(page, /<AboutFeatureCard key=\{index\} \{\.\.\.feature\}\/>/);
    assert.match(page, /safeLink\(href\)/);
    assert.doesNotMatch(page, /fetch\(|axios\.|useEffect\(|useState\(|new URLSearchParams\(/);
    assert.doesNotMatch(page, /<SiteFooter|<HomeFooter|<HomeHeader/);
});

test('About Us styling stays scoped, tokenized, responsive and uses the homepage content rail', () => {
    const css = read('resources/css/pm-about.css');
    const imports = read('resources/css/app.css');
    assert.match(imports, /@import '\.\/pm-about\.css';/);
    assert.match(css, /\.pm-about-page\s*\{/);
    assert.match(css, /\.pm-about-wrap\s*\{[^}]*width: var\(--pm-v2-container-width\)/);
    assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /@media \(max-width: 53\.125rem\)/);
    assert.match(css, /@media \(max-width: 40\.625rem\)/);
    assert.match(css, /@media \(max-width: 33\.75rem\)/);
    assert.match(css, /var\(--pm-guide-banner-glow\)/);
    assert.match(css, /var\(--pm-guide-line\)/);
    assert.match(css, /var\(--pm-guide-font\)/);
    assert.doesNotMatch(css, /\.pm-v2-header\s*\{|\.pm-v2-site-footer\s*\{|\.pm-dash-sidebar\s*\{/);
});


test('About Us must use the approved guide heading and body scale, not compact navigation or legal sizes', () => {
    const css = read('resources/css/pm-about.css');
    for (const token of ['--pm-guide-text-body', '--pm-guide-text-h1', '--pm-guide-text-h2', '--pm-guide-text-h3', '--pm-guide-text-lead', '--pm-guide-text-meta', '--pm-guide-banner-pad-top', '--pm-guide-banner-pad-bottom']) {
        assert.ok(css.includes(`var(${token})`), `Missing guide size: ${token}`);
    }
    assert.doesNotMatch(css, /var\(--pm-guide-text-legal-title\)/);
    assert.doesNotMatch(css, /var\(--pm-v2-font-caption\)|var\(--pm-v2-font-header-nav\)|var\(--pm-v2-font-body\)/);
    assert.match(css, /\.pm-about-content\s*\{\s*padding-block:\s*var\(--pm-guide-s12\)/);
});
