import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const terms = read('resources/js/components/pm/LegalPage.tsx');
const defaults = JSON.parse(read('resources/legal/defaults.json')).terms;
const style = read('resources/css/pm-terms.css');
const tokens = read('resources/css/pm-design-tokens.css');
const appStyles = read('resources/css/app.css');
const routes = read('routes/web.php');
const layout = read('resources/js/layouts/pm/PublicLayout.tsx');

test('Terms page is served by its existing public route with the shared homepage layout', () => {
    assert.match(routes, /Route::get\('\/terms', \[[^\n]+LegalPageController::class, 'terms'\]/);
    assert.match(read('resources/js/pages/public/Terms.tsx'), /<LegalPage legalPage=\{legalPage\} document="terms"/);
    assert.match(terms, /<PublicLayout siteLayout homePrototype guideLayout/);
    assert.match(layout, /<HomeHeader eventsVisible=\{homeEventsVisible\}\/>/);
    assert.match(layout, /<SiteFooter pricingPrototype=/);
    assert.doesNotMatch(terms, /fetch\(|axios\.|router\.get\(|useEffect\(/);
});

test('Original eleven sections and links are retained as the initial draft', () => {
    const expected = [
        'About these terms', 'Accounts and eligibility', 'Plans, purchases and refunds',
        'Learning content and exam practice', 'AI tools and career guidance',
        'Community rules and moderation', 'Your content and platform materials',
        'Events and third-party services', 'Service changes and account closure',
        'Consumer rights and disputes', 'Updates and contact',
    ];
    assert.deepEqual(defaults.sections.map(section=>section.title), expected);
    assert.match(terms, /Draft for review · 22 November 2026/);
    assert.equal(defaults.toc_title, "On this page");
    assert.match(terms, /aria-label=\{content.toc_title\}/);
    assert.match(terms, /href=\{`#\$\{section.id\}`\}/);
    for (const href of ['/privacy', '/refund-policy', '/community', '/contact']) assert.ok(defaults.sections.some(section => section.body.includes(`](${href})`)));
    assert.doesNotMatch(terms, /href="\/register"|payment intent|terms_accepted/i);
});

test('Terms design is scoped and uses centrally defined palette, type and spacing', () => {
    assert.match(appStyles, /@import '\.\/pm-terms\.css';/);
    assert.match(tokens, /--pm-guide-text-legal-title:/);
    assert.match(style, /\.pm-terms-grid\s*\{[^}]*grid-template-columns:/);
    assert.match(style, /\.pm-terms-wrap\s*\{[^}]*--pm-v2-container-width/);
    assert.match(style, /@media \(max-width: 40\.625rem\)/);
    assert.match(style, /max-width: var\(--pm-guide-reading-width\)/);
    assert.match(tokens, /--pm-guide-reading-width: 47\.5rem/);
    assert.match(style, /font-size: var\(--pm-guide-text-body\); line-height: var\(--pm-guide-line-body\)/);
    assert.match(style, /padding: var\(--pm-guide-banner-pad-top\) 0 var\(--pm-guide-banner-pad-bottom\)/);
    assert.match(style, /\.pm-terms-toc a \{[^}]*text-decoration: underline/);
    const usedTokens = [...style.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(match => match[1]);
    for (const token of usedTokens) assert.ok(tokens.includes(`${token}:`), `Missing central token: ${token}`);
    assert.doesNotMatch(style, /#[0-9a-fA-F]{3,8}\b/);
    assert.doesNotMatch(style, /font-family:\s*(Inter|Arial)/i);
});


test('Terms typography matches the approved Inter guide and other guide-based public pages', () => {
    const guideRoles = {
        page: /\.pm-terms-banner h1\s*\{[^}]*font-size:\s*var\(--pm-guide-text-h1\)/,
        section: /\.pm-terms-section h2\s*\{[^}]*font-size:\s*var\(--pm-guide-text-legal-section\)/,
        contents: /\.pm-terms-toc h2\s*\{[^}]*font-size:\s*var\(--pm-guide-text-h4\)/,
        body: /\.pm-terms-section p\s*\{[^}]*font-size:\s*var\(--pm-guide-text-body\)/,
        meta: /\.pm-terms-updated\s*\{[^}]*font-size:\s*var\(--pm-guide-text-meta\)/,
    };
    for (const [role, expression] of Object.entries(guideRoles)) {
        assert.match(style, expression, `${role} must use the shared design-guide type scale`);
    }
    assert.match(tokens, /--pm-guide-text-h1: clamp\(2rem, 5vw, 3\.1rem\)/);
    assert.match(tokens, /--pm-guide-text-h2: clamp\(1\.5rem, 3vw, 2rem\)/);
    assert.match(tokens, /--pm-guide-text-h4: 1rem/);
    assert.match(tokens, /--pm-guide-text-body: var\(--text-body\)/);
    assert.match(tokens, /--pm-guide-text-meta: var\(--text-ui\)/);
    assert.doesNotMatch(style, /\.pm-terms-section h2\s*\{[^}]*var\(--pm-guide-text-h3\)/);
});


test('Terms uses the same public rail and prototype column proportions as Learn & Practice', () => {
    const learning = read('resources/css/pm-learning-public.css');
    assert.doesNotMatch(style, /--pm-v2-container-width\s*:/);
    assert.match(style, /width: var\(--pm-v2-container-width\)/);
    assert.match(learning, /width: var\(--pm-v2-container-width\)/);
    assert.match(style, /grid-template-columns: var\(--pm-guide-terms-sidebar-width\) minmax\(0,1fr\)/);
    assert.match(tokens, /--pm-guide-terms-sidebar-width: 17rem/);
    assert.match(tokens, /--pm-guide-terms-column-gap: calc\(var\(--pm-guide-s12\) \+ var\(--pm-guide-s3\)\)/);
    assert.match(style, /\.pm-terms-main \{ padding-top: var\(--pm-guide-s12\)/);
    assert.match(style, /\.pm-terms-toc a \{[^}]*font-size: var\(--pm-guide-text-body\)/);
    assert.match(tokens, /--pm-guide-text-legal-section: 1\.5rem/);
});
