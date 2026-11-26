import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('homepage quick links open the verified public Laravel pages', () => {
    const hero = read('resources/js/components/home/v2/HomeHero.tsx');
    const defaults = read('config/homepage-v2.php').split("'quick_links' =>")[1].split("'certification' =>")[0];
    const routes = read('routes/web.php');
    for (const [label, href] of [
        ['Courses by experience level', '/learning'],
        ['Certification practice', '/exam-simulator/pmp'],
        ['Peer discussions', '/community'],
        ['Community events', '/events'],
    ]) {
        assert.ok(defaults.includes(`'label' => '${label}'`) && defaults.includes(`'href' => '${href}'`));
        assert.match(hero, /href=\{item.href\}>\{item.label\}/);
        assert.ok(routes.includes(`'${href}'`), `missing ${href} route`);
    }
    assert.doesNotMatch(hero, /href="#pm-v2-events-title"/);
});

test('selected hero tab retains filled background and thin border without a shadow', () => {
    const css = read('resources/css/pm-home-v2-layout.css');
    assert.match(css, /\.pm-v2-hero-tabs button\.is-active\s*\{[^}]*border-color:\s*var\(--pm-v2-tab-border\);[^}]*box-shadow:\s*none;/);
    assert.match(css, /\.pm-v2-hero-tabs button \{[^}]*border:\s*1px solid transparent/);
});

test('homepage footer uses screenshot-matching links and the approved social icon order', () => {
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    for (const label of ['About Us', 'Testimonials', 'Trends', 'Help Centre', 'Exam Simulator', 'Courses', 'AI Tools',
        'Community Feed', 'Daily Challenge', 'Events', 'Community Guidelines', 'Compare Plans', 'How to Purchase', 'Privacy Policy', 'Terms and Conditions', 'Refund Policy']) {
        assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes(`'${label}'`), `missing ${label}`);
    }
    assert.doesNotMatch(footer, /pm-v2-footer-payments/);
    assert.match(footer, /\{content\.legal_notice\}/);
    assert.match(footer, /FooterSocial content=\{content\} compact/);
});
