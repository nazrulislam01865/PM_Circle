import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const cssDir = new URL('resources/css/', root);
const tokens = read('resources/css/pm-design-tokens.css');
const cssFiles = readdirSync(cssDir).filter(name => name.endsWith('.css'));
const values = new Map();
for (const [, key, value] of tokens.matchAll(/(--[\w-]+):\s*([^;{}]+);/g)) {
    // First value is the base value; responsive root aliases follow it.
    if (!values.has(key)) values.set(key, value.trim());
}
function resolve(key, chain = []) {
    assert.ok(!chain.includes(key), `Circular token: ${[...chain, key].join(' -> ')}`);
    assert.ok(values.has(key), `Missing token ${key}`);
    return values.get(key).replace(/^var\((--[\w-]+)\)$/, (_, next) => resolve(next, [...chain, key]));
}

test('canonical body, metadata, typography, palette and controls resolve to the latest guide', () => {
    const expected = {
        '--text-body':'1rem', '--line-body':'1.6', '--text-sm':'.875rem', '--text-xs':'.875rem',
        '--pm-guide-text-control':'.875rem', '--pm-guide-text-lead':'1.0625rem',
        '--pm-member-font-body':'1rem', '--pm-guide-text-h1':'clamp(2rem, 5vw, 3.1rem)',
        '--pm-guide-text-h2':'clamp(1.5rem, 3vw, 2rem)', '--pm-guide-text-h3':'1.125rem',
        '--pm-guide-text-h4':'1rem', '--pm-guide-line-h1':'1.12', '--pm-guide-line-h2':'1.2',
        '--pm-guide-line-h3':'1.35', '--pm-guide-line-h4':'1.4',
        '--control-height':'2.75rem', '--pm-member-control-height':'2.75rem',
        '--pm-admin-settings-control-height':'2.75rem', '--pm-admin-settings-action-height':'2.75rem',
        '--pm-admin-settings-control-text':'.875rem', '--radius-control':'.5rem', '--radius-card':'.875rem',
        '--pm-v2-width':'73.75rem', '--ink':'#10223d', '--pm-guide-body-color':'#344861',
        '--blue':'#075db3', '--blue-hover':'#064c93', '--muted':'#52647a',
        '--border':'#d8e3ef', '--control-border':'#7c91ac', '--pm-v2-footer-bg':'#0d223d',
    };
    for (const [key, value] of Object.entries(expected)) assert.equal(resolve(key), value, key);
    assert.equal(resolve('--font-ui'), '"Inter", system-ui, Arial, sans-serif');
});

test('feature styles cannot redefine the core theme and public rail', () => {
    for (const file of cssFiles.filter(name => name !== 'pm-design-tokens.css')) {
        const css = read(`resources/css/${file}`);
        assert.doesNotMatch(css, /(?:^|[;{\s])--(?:font-ui|pm-guide-[\w-]+|pm-v2-container-width|pm-v2-prototype-rail|control-height|control-border|radius-card|radius-control|text-body|line-body|ink|blue|blue-hover|focus)\s*:/, file);
    }
});

test('all authored CSS typography and color literals consume centrally managed values', () => {
    for (const file of cssFiles.filter(name => name !== 'pm-design-tokens.css')) {
        const css = read(`resources/css/${file}`).replace(/\/\*[\s\S]*?\*\//g,'');
        for (const [, key, value] of css.matchAll(/(?<![\w-])(font-size|font-family|font-weight|line-height|letter-spacing|font)\s*:\s*([^;{}]+)/g)) {
            const text = value.replace(/\s*!important\s*$/, '').trim();
            assert.ok(text.includes('var(--') || ['inherit','normal','initial','unset','0'].includes(text), `${file}: ${key}: ${text}`);
        }
        // CSS URL fragments (SVG masks etc.) are assets, not a page-local color declaration.
        const declarations = css.replace(/url\([^)]*\)/g, 'url(asset)');
        assert.doesNotMatch(declarations, /:\s*[^;{}]*\brgba?\(\s*[\d.%, /]+\)/, file);
    }
});

test('shared text controls do not resize native checkbox and radio inputs', () => {
    for (const file of ['pm-circle.css','pm-ui-guideline.css']) {
        const css=read(`resources/css/${file}`);
        assert.match(css, /\.pm-field input:not\(\[type="checkbox"\], \[type="radio"\]/);
        assert.doesNotMatch(css, /\.pm-field input,\s*\.pm-field select/);
    }
});
