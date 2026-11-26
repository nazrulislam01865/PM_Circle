import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/components/pm/LegalPage.tsx');
const body = read('resources/js/components/pm/LegalContent.tsx');
const defaults = JSON.parse(read('resources/legal/defaults.json')).privacy;
const original = defaults.sections.map(section=>section.body).join('\n');
const css = read('resources/css/pm-terms.css');
const tokens = read('resources/css/pm-design-tokens.css');
const titles = [
    'Who we are', 'Information we collect', 'How we use information',
    'Profiles, community and event visibility', 'AI features and automated feedback',
    'Who may receive information', 'Cookies and browser storage', 'Retention and security',
    'Your choices and requests', 'Children’s privacy', 'Changes and contact',
];

test('Privacy uses the existing route, shared homepage layout and server-provided content', () => {
    assert.match(read('routes/web.php'), /Route::get\('\/privacy', \[[^\n]+LegalPageController::class, 'privacy'\]/);
    assert.match(read('resources/js/pages/public/Privacy.tsx'), /<LegalPage legalPage=\{legalPage\} document="privacy"/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout banner=\{\{[^\n]*\}\}>/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<HomeHeader eventsVisible=\{homeEventsVisible\}/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<SiteFooter pricingPrototype=/);
    assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes("$link('Privacy Policy', '/privacy')"));
    assert.doesNotMatch(page + body, /fetch\(|axios\.|useEffect\(|router\.get\(|dangerouslySetInnerHTML/);
});

test('Privacy initial draft retains every section, list label and draft notice', () => {
    assert.deepEqual(defaults.sections.map(section=>section.title), titles);
    assert.deepEqual([...original.matchAll(/- \*\*([^*]+)\*\*/g)].map(m=>m[1]), [
        'Account and profile.', 'Learning and practice.', 'Community and events.',
        'Career and AI tools.', 'Purchases and support.', 'Technical information.',
    ]);
    assert.match(defaults.description, /How PM Circle handles your information and the choices available to you\./);
    assert.match(page, /Draft for review · 22 November 2026/);
    assert.match(original, /other members see an anonymous label and authorised moderators can identify the author/);
    assert.match(original, /including retention and any model-training use/);
    assert.match(original, /Some service providers may process information outside Bangladesh/);
    assert.match(original, /We may verify your identity before acting on the request/);
});

test('Contents navigation, semantic headings and original links are connected', () => {
    const ids = defaults.sections.map(section=>section.id);
    assert.equal(ids.length, 11);
    assert.equal(new Set(ids).size, 11);
    assert.match(page, /aria-label=\{content.toc_title\}/);
    assert.match(page, /href=\{`#\$\{section.id\}`\}/);
    assert.match(page, /id=\{section.id\}/);
    assert.match(page, /<h2>\{section.title\}<\/h2>/);
    assert.match(page, /href="\/">Home/);
    assert.equal([...original.matchAll(/\[contact ITQAN Consulting\]\(\/contact\)/g)].length, 2);
    assert.match(original, /\[Terms and Conditions\]\(\/terms\)/);
});

test('Privacy reuses centralized legal-page roles and responsive layout', () => {
    assert.match(page, /pm-privacy-policy-page/);
    for (const name of ['banner', 'wrap', 'breadcrumb', 'main', 'grid', 'toc', 'article', 'section', 'updated', 'list']) {
        assert.ok((page + body).includes(`pm-terms-${name}`), name);
        assert.ok(css.includes(`.pm-terms-${name}`), name);
    }
    const additions = css.split('/* Shared legal-document bullet list.')[1].split('/* Refund Policy shares')[0];
    assert.doesNotMatch(additions, /#[0-9a-fA-F]{3,8}\b|font-family:|font-size:\s*(?:[0-9.]|clamp\()/);
    for (const [, token] of additions.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`), token);
    assert.match(additions, /font-size: var\(--pm-guide-text-body\)/);
    assert.match(additions, /line-height: var\(--pm-guide-line-body\)/);
    assert.doesNotMatch(additions, /--pm-v2-container-width\s*:/);
    assert.match(additions, /@media \(max-width: 40\.625rem\)/);
    assert.match(tokens, /@media \(max-width: 540px\)/);
    assert.match(additions, /scroll-margin-top: calc\(var\(--header-height\) \+ var\(--pm-guide-s12\)\)/);
});
