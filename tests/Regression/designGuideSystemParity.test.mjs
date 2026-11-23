import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = p => readFileSync(path.join(root, p), 'utf8');
const guide = read('PM_Circle_Design_Guidelines (1).html').split('@font-face')[0];
const tokens = read('resources/css/pm-design-tokens.css');
const about = read('resources/css/pm-about.css');
const app = read('resources/css/app.css');
const blade = read('resources/views/app.blade.php');

function guideValue(name) {
    const match = guide.match(new RegExp(`\\-\\-${name}\\s*:\\s*([^;]+);`));
    assert.ok(match, `HTML design guideline missing ${name}`);
    return match[1].trim();
}
function tokenValue(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = tokens.match(new RegExp(`\\-\\-${escaped}\\s*:\\s*([^;]+);`));
    assert.ok(match, `Canonical tokens missing ${name}`);
    return match[1].trim();
}

test('global font and body rhythm come from approved HTML guide', () => {
    assert.equal(tokenValue('font-ui').slice(1,6), 'Inter');
    assert.equal(tokenValue('text-body'), '1rem');
    assert.equal(tokenValue('line-body'), '1.6');
    assert.equal(guideValue('pm-font'), 'Inter, system-ui, Arial, sans-serif');
    assert.equal(guideValue('pm-container'), '73.75rem');
    assert.equal(tokenValue('pm-guide-font'), 'var(--font-ui)');
    assert.match(app, /html \{ font-family: var\(--font-ui\); \}/);
    assert.match(blade, /family=Inter:wght@400;600;700/);
});

test('semantic color and type values match provided HTML exactly', () => {
    const roles = {
        'ink': 'pm-guide-ink', 'body': 'pm-guide-body-color', 'muted': 'pm-guide-muted',
        'blue': 'pm-guide-blue', 'blue-hover': 'pm-guide-blue-hover',
        'line': 'pm-guide-line', 'control-line': 'pm-guide-control-line',
        'soft': 'pm-guide-soft', 'pale': 'pm-guide-pale', 'footer': 'pm-guide-footer',
        'green-bg': 'pm-guide-green-bg', 'green': 'pm-guide-green',
        'amber-bg': 'pm-guide-amber-bg', 'amber': 'pm-guide-amber',
        'purple-bg': 'pm-guide-purple-bg', 'purple': 'pm-guide-purple',
        'error': 'pm-guide-error',
    };
    for (const [htmlKey, cssKey] of Object.entries(roles)) {
        assert.equal(tokenValue(cssKey).toLowerCase(), guideValue(`pm-${htmlKey}`).toLowerCase(), `${cssKey} drifts from guide`);
    }
    assert.equal(tokenValue('pm-guide-text-h1'), 'clamp(2rem, 5vw, 3.1rem)');
    assert.equal(tokenValue('pm-guide-text-h2'), 'clamp(1.5rem, 3vw, 2rem)');
    assert.equal(tokenValue('pm-guide-text-h3'), '1.125rem');
    assert.equal(tokenValue('pm-guide-text-body'), '1rem');
    assert.equal(tokenValue('pm-guide-line-body'), '1.6');
});

test('About Us keeps the homepage rail and guide scale at different viewport sizes', () => {
    assert.match(about, /\.pm-about-wrap\s*\{[^}]*container-type: inline-size;/);
    assert.match(about, /@supports \(container-type: inline-size\) and \(width: 1cqw\)/);
    assert.match(about, /--pm-guide-text-h1: var\(--pm-guide-rail-h1\);/);
    assert.match(about, /--pm-guide-text-h2: var\(--pm-guide-rail-h2\);/);
    assert.equal(tokenValue('pm-guide-rail-h1'), 'clamp(2rem, 5cqw, 3.1rem)');
    assert.equal(tokenValue('pm-guide-rail-h2'), 'clamp(1.5rem, 2.25cqw, 1.625rem)');
    assert.match(about, /font-weight: var\(--pm-guide-static-h1-weight\)/);
    assert.match(about, /width: var\(--pm-v2-container-width\)/);
    assert.doesNotMatch(about, /#[0-9a-fA-F]{3,8}\b/);
});

test('project feature styles define font-family only via central tokens/inheritance', () => {
    const dir = path.join(root, 'resources/css');
    for (const file of readdirSync(dir).filter(f => f.endsWith('.css'))) {
        const css = read(`resources/css/${file}`);
        const properties = [...css.matchAll(/font-family\s*:\s*([^;}]+)/g)];
        for (const [, expression] of properties) {
            assert.ok(/var\(--|inherit/.test(expression), `${file}: non-central font-family ${expression.trim()}`);
        }
    }
});
