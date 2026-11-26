import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('homepage Trends promotion appears once between resume and events, without changing their visibility', () => {
    const page = read('resources/js/pages/public/Home.tsx');
    assert.equal((page.match(/<HomeTrends\b/g) || []).length, 1);
    assert.ok(page.indexOf('<HomeResume ') < page.indexOf('<HomeTrends '));
    assert.ok(page.indexOf('<HomeTrends ') < page.indexOf('<HomeEvents '));
    for (const key of ['resume','trends','events']) assert.ok(page.includes(`visible('${key}')`));
    assert.match(page, /<PublicLayout siteLayout homePrototype/);
});

test('Trends promotion reuses approved copy, existing photo, action and route', () => {
    const section = read('resources/js/components/home/v2/HomeTrends.tsx');
    const defaults = read('config/homepage-v2.php').split("'trends' =>")[1].split("'events' =>")[0];
    assert.match(defaults, /'photo' => 'leader'/);
    assert.match(defaults, /'button_url' => '\/pm-trends'/);
    assert.match(defaults, /Weekly updates on project management, business analysis, technology, AI and more\./);
    assert.match(section, /source=\{content.image\}/);
    assert.match(section, /href=\{content.button_url\}/);
    assert.match(section, /aria-labelledby="pm-v2-trends-title"/);
    assert.match(section, /id="pm-v2-trends-title">\{content.heading\}/);
    assert.doesNotMatch(section, /fetch\(|router\.|useEffect|useState|style=/);
    assert.ok(existsSync(new URL('../../public/images/home/prototype/leader.webp', import.meta.url)));
    assert.match(read('routes/web.php'), /Route::inertia\('\/pm-trends', 'trends\/Index'\)/);
});

test('Trends banner uses shared container, centralized design roles and responsive styles', () => {
    const section = read('resources/js/components/home/v2/HomeTrends.tsx');
    const css = read('resources/css/pm-home-v2-sections.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    const block = css.split('/* Homepage Trends promotion:')[1].split('.pm-v2-events-section')[0];
    assert.match(section, /pm-v2-container pm-v2-trends-banner/);
    for (const token of ['pm-v2-font-promo-heading', 'pm-v2-promo-overlay', 'pm-v2-promo-inset', 'pm-v2-promo-min-height', 'pm-v2-promo-copy-width']) {
        assert.ok(tokens.includes(`--${token}:`), token);
        assert.ok(block.includes(`var(--${token})`), token);
    }
    assert.match(block, /font-size: var\(--pm-v2-font-body\)/);
    assert.match(block, /border-radius: var\(--pm-guide-radius-card\)/);
    assert.doesNotMatch(block, /(?:font-size|font-weight|color|background|border-radius|padding):\s*(?!var\()[^;\n]+(?:px|rem|#[\da-f]{3,8})/i);
    assert.match(read('resources/css/pm-home-v2-responsive.css'), /\.pm-home-v2 \.pm-v2-trends-banner \{ flex-direction: column;/);
});
