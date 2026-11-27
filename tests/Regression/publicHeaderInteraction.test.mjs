import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const header = read('resources/js/components/home/v2/HomeHeader.tsx');
const css = read('resources/css/pm-home-v2-layout.css');
const responsive = read('resources/css/pm-home-v2-responsive.css');

test('public navigation states share the central blue token with no underline', () => {
    assert.match(css, /\.pm-v2-header-nav > a\[aria-current="page"\],[\s\S]*?summary:focus-visible \{ color: var\(--blue\); text-decoration: none; \}/);
    assert.match(css, /\.pm-v2-header-nav > a:hover,\s*\.pm-v2-header-nav summary:hover,[^}]*color: var\(--blue\); text-decoration: none;/);
    assert.match(css, /\.pm-v2-nav-dropdown a:focus-visible,[^}]*background: var\(--blue-soft\); color: var\(--blue\); text-decoration: none;/);
    assert.match(css, /\.pm-home-v2-shell \.pm-v2-header-nav :is\(a, summary\):focus-visible[^}]*outline: 3px solid var\(--focus\)/);
});

test('route matching covers direct links, descendants and the simulator alias', () => {
    assert.match(header, /page\.url\.split\(\/\[\?#\]\//);
    assert.match(header, /pathname === href\) return 'page'/);
    assert.match(header, /pathname\.startsWith\(`\$\{href\}\/`\)\) return 'location'/);
    assert.match(header, /href === '\/simulators' && \(pathname === '\/exam-simulator' \|\| pathname\.startsWith\('\/exam-simulator\/'\)\)/);
    for (const href of ['/pm-trends', '/events']) {
        assert.ok(header.includes(`href="${href}" onClick={close} aria-current={navigationCurrent(pathname, '${href}')}`));
    }
    for (const label of ['Exam Simulator', 'Learn & Practice', 'Community']) {
        assert.ok(header.includes(`<HeaderDropdown label="${label}" pathname={pathname} active={`));
    }
    assert.match(header, /!eventsVisible && isCurrent\('\/events'\)/);
});

test('desktop mouse hover opens the reusable dropdown; compact touch and keyboard retain native controls', () => {
    assert.match(header, /pointerType === 'mouse' && window\.matchMedia\('\(width > 1050px\)'\)\.matches/);
    assert.match(responsive, /@media \(max-width: 1050px\)/);
    assert.match(header, /onPointerEnter=.*desktopMouse\(event\.pointerType\).*setAttribute\('open', ''\)/);
    assert.match(header, /onPointerLeave=.*querySelector\(':focus-visible'\).*removeAttribute\('open'\)/);
    assert.match(header, /onBlur=.*\n\s*if \(!event\.currentTarget\.contains\(event\.relatedTarget\)\)/);
    assert.match(header, /event\.key === 'Escape'[\s\S]*?querySelector\('summary'\)\?\.focus\(\)/);
    assert.match(header, /<summary>\{label\}/);
});
