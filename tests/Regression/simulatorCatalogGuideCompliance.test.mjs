import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const guide = read('PM_Circle_Design_Guidelines (1).html');
const tokens = read('resources/css/pm-design-tokens.css');
const css = read('resources/css/pm-simulator-catalog.css');
const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
const layout = read('resources/js/pages/exam/Browse.tsx');

const values = [
    ['ink', '#10223d'], ['body-color', '#344861'], ['muted', '#52647a'],
    ['blue', '#075db3'], ['blue-hover', '#064c93'], ['line', '#d8e3ef'],
    ['control-line', '#7c91ac'], ['soft', '#f4f8fc'], ['pale', '#eaf3ff'],
    ['green-bg', '#e5f5ed'], ['green', '#215d40'],
    ['amber-bg', '#fff2d7'], ['amber', '#704700'],
    ['purple-bg', '#eeeafd'], ['purple', '#523590'],
    ['error', '#a82130'],
];

test('catalog palette uses the exact approved design-guide colors in centralized tokens', () => {
    for (const [name, value] of values) {
        assert.ok(guide.includes(value), `guide must contain ${name} (${value})`);
        assert.ok(tokens.includes(`--pm-guide-${name}: ${value};`), `${name} must be centralized`);
    }
    assert.doesNotMatch(css, /#[\da-f]{3,8}\b/i, 'no page-local hex colors');
});

test('type, spacing, radii and container use the guide values', () => {
    for (const spec of [
        '--pm-guide-font: var(--font-ui);',
        '--pm-guide-text-body: var(--text-body);',
        '--pm-guide-text-lead: 1.0625rem;',
        '--pm-guide-text-h1: clamp(2rem, 5vw, 3.1rem);',
        '--pm-guide-text-h2: clamp(1.5rem, 3vw, 2rem);',
        '--pm-guide-text-h3: 1.125rem;',
        '--pm-guide-text-control: var(--text-ui);',
        '--pm-guide-weight-h1: 750;',
        '--pm-guide-weight-control: 650;',
        '--pm-guide-radius-sm: var(--radius-control);',
        '--pm-guide-radius-card: .875rem;',
        '--pm-guide-radius-feature: 1.125rem;',
        '--pm-guide-container: 73.75rem;',
        '--pm-guide-gutter: 1.5rem;',
        '--pm-guide-gutter-mobile: var(--s4);',
        '--pm-guide-s12: 3rem;',
    ]) assert.ok(tokens.includes(spec), `missing design token ${spec}`);
    assert.match(css, /\.pm-sim-banner > \.pm-v2-container, \.pm-sim-main\s*\{\s*width: var\(--pm-v2-container-width\)/);
    assert.match(css, /\.pm-sim-card-grid\s*\{[^}]*repeat\(3,/);
    assert.match(css, /@media \(max-width: 850px\)/);
    assert.match(css, /@media \(max-width: 540px\)/);
    for (const [, font] of css.matchAll(/font-size:\s*([^;]+);/g)) {
        assert.ok(font.startsWith('var(--pm-guide-'), `page-local font-size bypasses centralized guide: ${font}`);
    }
    assert.match(css, /\.pm-simulators-page \.pm-sim-action/);
    assert.match(css, /font-weight: var\(--pm-guide-weight-control\)/);
});

test('shared homepage shell remains in use and mockup footer wording is removed', () => {
    assert.match(layout, /<PublicLayout siteLayout homePrototype/);
    assert.doesNotMatch(footer, /Homepage design mockup|Sample content/);
    assert.match(footer, /<span>\{content\.copyright_label\}<\/span>/);
});
