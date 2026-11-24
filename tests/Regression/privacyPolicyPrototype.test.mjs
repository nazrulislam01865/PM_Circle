import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/public/Privacy.tsx');
const css = read('resources/css/pm-terms.css');
const tokens = read('resources/css/pm-design-tokens.css');
const titles = [
    'Who we are', 'Information we collect', 'How we use information',
    'Profiles, community and event visibility', 'AI features and automated feedback',
    'Who may receive information', 'Cookies and browser storage', 'Retention and security',
    'Your choices and requests', 'Children’s privacy', 'Changes and contact',
];

test('Privacy uses the existing route and shared homepage layout without new requests', () => {
    assert.match(read('routes/web.php'), /Route::inertia\('\/privacy', 'public\/Privacy'\)->name\('privacy'\)/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout>/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<HomeHeader eventsVisible=\{homeEventsVisible\}/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<SiteFooter pricingPrototype=/);
    assert.match(read('resources/js/components/home/v2/HomeFooter.tsx'), /'\/privacy', 'Privacy Policy'/);
    assert.doesNotMatch(page, /fetch\(|axios\.|useEffect\(|router\.get\(|dangerouslySetInnerHTML|import Info/);
});

test('Privacy prototype retains every section, list label and draft notice', () => {
    assert.deepEqual([...page.matchAll(/title: '([^']+)'/g)].map(m => m[1]), titles);
    assert.deepEqual([...page.matchAll(/<li><strong>([^<]+)<\/strong>/g)].map(m => m[1]), [
        'Account and profile.', 'Learning and practice.', 'Community and events.',
        'Career and AI tools.', 'Purchases and support.', 'Technical information.',
    ]);
    assert.match(page, /How PM Circle handles your information and the choices available to you\./);
    assert.match(page, /Draft for review · 22 November 2026/);
    assert.match(page, /other members see an anonymous label and authorised moderators can identify the author/);
    assert.match(page, /including retention and any model-training use/);
    assert.match(page, /Some service providers may process information outside Bangladesh/);
    assert.match(page, /We may verify your identity before acting on the request/);
    assert.doesNotMatch(page, /Homepage design mockup|A counsel-reviewed privacy notice/);
});

test('Contents navigation, semantic headings and local links are connected', () => {
    const ids = [...page.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
    assert.equal(ids.length, 11);
    assert.equal(new Set(ids).size, 11);
    assert.match(page, /aria-label="On this page"/);
    assert.match(page, /href=\{`#\$\{section.id\}`\}/);
    assert.match(page, /id=\{section.id\}/);
    assert.match(page, /aria-labelledby=\{`\$\{section.id\}-title`\}/);
    assert.match(page, /id=\{`\$\{section.id\}-title`\}/);
    assert.match(page, /href="\/">Home/);
    assert.equal([...page.matchAll(/href="\/contact">contact ITQAN Consulting/g)].length, 2);
    assert.match(page, /href="\/terms">Terms and Conditions/);
});

test('Privacy reuses centralized legal-page roles and responsive layout', () => {
    assert.match(page, /className="pm-terms-page pm-privacy-policy-page"/);
    for (const name of ['banner', 'wrap', 'breadcrumb', 'main', 'grid', 'toc', 'article', 'section', 'updated', 'list']) {
        assert.ok(page.includes(`pm-terms-${name}`), name);
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
