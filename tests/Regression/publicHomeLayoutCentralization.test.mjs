import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('previous homepage rail is restored while other public-page dimensions remain unchanged', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    const global = read('resources/css/pm-prototype.css');
    const layout = read('resources/css/pm-home-v2-layout.css');
    const sections = read('resources/css/pm-home-v2-sections.css');
    const responsive = read('resources/css/pm-home-v2-responsive.css');
    assert.match(tokens, /--pm-public-layout-max-width: 92\.5rem/);
    assert.match(tokens, /--pm-v2-width: 90rem/);
    assert.match(tokens, /--pm-v2-container-width: min\(70\.2vw, var\(--pm-v2-width\)\)/);
    assert.match(global, /width: min\(var\(--pm-public-layout-max-width\)/);
    assert.match(layout, /\.pm-home-v2 \.pm-v2-container \{ width: var\(--pm-v2-container-width\)/);
    assert.match(layout, /\.pm-home-v2-shell \.pm-v2-header-inner[^}]*width: var\(--pm-v2-container-width\)/);
    assert.match(sections, /\.pm-home-v2-shell \.pm-v2-site-footer \.pm-v2-container \{ width: var\(--pm-v2-container-width\)/);
    assert.match(responsive, /max-width: 1500px/);
    assert.match(responsive, /--pm-v2-container-width: min\(70\.2vw, calc\(100% - 3rem\)\)/);
    assert.match(responsive, /--pm-v2-container-width: min\(90vw, calc\(100% - 3rem\)\)/);
    assert.match(responsive, /--pm-v2-container-width: calc\(100% - var\(--s4\) - var\(--s4\)\)/);
    assert.doesNotMatch(responsive, /max-width: 980px/);
});

test('discussion composer uses the pencil icon with unchanged click behavior', () => {
    const community = read('resources/js/components/home/v2/HomeCommunity.tsx');
    assert.match(community, /import \{ Pencil \} from 'lucide-react'/);
    assert.match(community, /<Pencil aria-hidden="true"\/> Start a discussion/);
    assert.match(community, /onClick=\{\(\) => onJoin\('start a discussion'\)\}/);
    assert.doesNotMatch(community, /<Plus /);
});

test('homepage font family and every nonzero font size come from centralized tokens', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    for (const value of ['--pm-v2-font-brand-title', '--pm-v2-font-resume-title', '--pm-v2-font-resume-subtitle', '--pm-v2-font-event-date', '--pm-v2-font-body-mobile', '--pm-v2-font-ui-mobile', '--pm-v2-font-card-heading-mobile']) {
        assert.ok(tokens.includes(value), value);
    }
    for (const name of ['pm-home-v2-layout.css','pm-home-v2-sections.css','pm-home-v2-responsive.css']) {
        const css = read('resources/css/' + name);
        assert.doesNotMatch(css, /font-size:\s*(?!0\s*;)(?:\d+(?:\.\d+)?(?:px|rem)|clamp\()/);
    }
    assert.match(read('resources/css/pm-home-v2-layout.css'), /font-family: var\(--font-ui\)/);
});

test('footer groups, social icons and event link share existing admin data and visual structure', () => {
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.match(footer, /eventsVisible = true/);
    assert.match(footer, /aiVisible = true/);
    assert.doesNotMatch(footer, /pm-v2-footer-payments/);
    assert.match(footer, /show_legal !== false/);
    assert.match(footer, /FooterSocial content=\{content\} compact prototypeOrder/);
    assert.match(footer, /href: '\/events'/);
    assert.doesNotMatch(footer, /href: '\/#pm-v2-events-title'/);
    assert.match(read('resources/js/components/pm/SiteFooter.tsx'), /eventsVisible=\{homeEventsVisible\}/);
});
