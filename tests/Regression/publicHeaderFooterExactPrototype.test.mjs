import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('public header contains all screenshot dropdown entries in the required order', () => {
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    for (const [label, entries] of [
        ['Exam Simulator', ['Browse simulators', 'Compare Plans']],
        ['Learn & Practice', ['Browse courses', 'AI learning tools']],
        ['Community', ['Community feed', 'Daily Challenge', 'Community events']],
    ]) {
        const group = header.indexOf(`<HeaderDropdown label="${label}"`);
        assert.notEqual(group, -1, `Missing ${label} menu`);
        let last = group;
        for (const entry of entries) {
            const index = header.indexOf(`label: '${entry}'`, last);
            assert.ok(index > last, `${entry} appears in the ${label} menu in order`);
            last = index;
        }
    }
    assert.match(header, /href="\/pm-trends"[^>]*>Trends<\/Link>/);
    assert.match(header, /href="\/events"[^>]*>Events<\/Link>/);
    assert.match(header,  /onPointerLeave=.*event.pointerType === 'mouse'.*removeAttribute\('open'\)/);
    assert.match(header, /event\.key === 'Escape'/);
});

test('all prototype header links resolve to declared public destinations', () => {
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    const routes = read('routes/web.php');
    const targets = [
        ['/simulators', "'/simulators'"],
        ['/pricing', "'/pricing'"],
        ['/learning', "'/learning'"],
        ['/community', "'/community'"],
        ['/daily-challenge', "'/daily-challenge'"],
        ['/events', "'/events'"],
        ['/pm-trends', "'/pm-trends'"],
    ];
    for (const [target, routeLiteral] of targets) {
        assert.ok(header.includes(target), `${target} linked`);
        assert.ok(routes.includes(routeLiteral), `${target} route exists`);
    }
    assert.match(header, /\/\#pm-v2-ai/);
    assert.match(read('resources/js/components/home/v2/HomeAiResume.tsx'), /id="pm-v2-ai"/);
});

test('homepage footer retains the screenshot copy and existing admin visibility toggles', () => {
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    for (const label of ['Company', 'Learning', 'Community', 'Plans & Policies', 'About Us', 'Testimonials', 'Trends', 'Help Centre', 'Courses', 'AI Tools', 'Community Feed', 'Daily Challenge', 'Events', 'Community Guidelines', 'Compare Plans', 'How to Purchase', 'Privacy Policy', 'Terms and Conditions', 'Refund Policy']) {
        assert.ok(footer.includes(`'${label}'`) || footer.includes(`"${label}"`), `Missing ${label}`);
    }
    assert.match(footer, /Learn project management, practise for certification, and connect with peers\./);
    assert.match(footer, /Trademark notice\./);
    assert.match(read('resources/js/components/pm/trademarkNotice.ts'), /PMP®, CAPM®, PMI-ACP® and PMI-PBA®/);
    assert.match(footer, /\{trademarkNotice\}/);
    assert.match(footer, /© PM Circle by ITQAN/);
    assert.match(footer, /content\.show_legal !== false/);
    assert.doesNotMatch(footer, /pm-v2-footer-payments/);
    assert.doesNotMatch(footer, /Homepage design mockup · Sample content/);
});

test('dropdown and footer styling use centralized tokens without global changes', () => {
    const layout = read('resources/css/pm-home-v2-layout.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    assert.match(layout, /min-width: var\(--pm-v2-nav-dropdown-width\)/);
    assert.match(tokens, /--pm-v2-nav-dropdown-width: 17rem;/);
    assert.match(layout, /\.pm-v2-nav-dropdown a \{[^}]+font-size: var\(--pm-v2-font-header-nav\)/);
});
