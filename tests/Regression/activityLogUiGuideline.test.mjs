import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const guide = read('pmDoc/PM_Circle_UI_Style_Guide (4)(8).html');
const currentGuide = read('PM_Circle_Design_Guidelines (1).html');
const tokens = read('resources/css/pm-design-tokens.css');
const css = read('resources/css/pm-activity-log.css');
const page = read('resources/js/pages/account/ActivityLog.tsx');
const parts = read('resources/js/components/activity/ActivityLogParts.tsx');
const sharedControls = read('resources/css/pm-ui-guideline.css');

test('canonical typography, spacing, control, and icon tokens match the approved guide', () => {
    for (const name of ['font-ui',
        'text-ui',
        'text-xs', 'line-xs', 's2', 's3', 's4', 's5', 'radius-card', 'radius-control',
        'control-height', 'control-touch', 'icon', 'ink', 'muted', 'blue', 'border', 'control-border']) {
        const escape = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`--${escape}\\s*:\\s*([^;]+);`);
        const expected = guide.match(pattern)?.[1].trim();
        const actual = tokens.match(pattern)?.[1].trim();
        assert.ok(expected, `Guide token ${name} must exist`);
        if (name === 'font-ui') {
            assert.ok(actual?.startsWith('\"Inter\"'), 'project-wide Inter font override');
        } else {
            assert.equal(actual, expected, `Token ${name} must match the approved UI guide`);
        }
    }
    // The November 23 HTML guide supersedes the earlier body and heading types.
    assert.match(currentGuide, /font-size: clamp\(2rem,5vw,3\.1rem\)/);
    for (const [name, value] of Object.entries({
        'text-body': '1rem', 'line-body': '1.6',
        'text-h1': 'var(--pm-guide-text-h1)', 'line-h1': 'var(--pm-guide-line-h1)',
        'text-h2': 'var(--pm-guide-text-h2)', 'line-h2': 'var(--pm-guide-line-h2)',
        'text-sm': '.875rem', 'line-sm': '1.35',
        'text-h5': '1rem', 'line-h5': '1.4', 'line-ui': '1.35',
    })) assert.match(tokens, new RegExp(`--${name}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};`));
});

test('Activity Log inherits member layout rather than defining a new page frame or color scale', () => {
    assert.match(page, /<PublicLayout>/);
    assert.match(page, /pm-container pm-page pm-activity-page/);
    assert.doesNotMatch(css, /pm-activity-page\s*\{[^}]*\b(?:width|max-width|background|padding)\s*:/s);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|oklch\(/i);
    assert.doesNotMatch(css, /font-size:\s*[0-9.]+(?:px|rem)/);
});

test('Activity Log uses guide heading, supporting text, badge, and icon metrics', () => {
    assert.match(css, /font: var\(--bold\) var\(--text-h1\)\/var\(--line-h1\)/);
    assert.match(css, /font: var\(--bold\) var\(--text-h2\)\/var\(--line-h2\)/);
    assert.match(css, /font: var\(--semibold\) var\(--text-h5\)\/var\(--line-h5\)/);
    assert.match(css, /font: var\(--semibold\) var\(--text-xs\)\/var\(--line-xs\)/);
    assert.match(css, /font: var\(--regular\) var\(--text-sm\)\/var\(--line-sm\)/);
    assert.match(css, /\.pm-activity-icon svg,[\s\S]*width: var\(--icon\);[\s\S]*height: var\(--icon\)/);
    assert.doesNotMatch(parts, /size=\{(?:17|19|23)\}/);
});

test('native filters and button actions reuse centralized PM Circle control contracts', () => {
    assert.match(page, /className="pm-button pm-button-outline pm-activity-clear"/);
    assert.match(page, /className="pm-button pm-button-outline pm-activity-more-button"/);
    assert.match(parts, /<select className="pm-select"/);
    assert.match(css, /border: 1px solid var\(--control-border\)/);
    assert.match(sharedControls, /\.pm-select/);
    assert.match(sharedControls, /var\(--control-touch\)/);
    assert.doesNotMatch(css, /outline:\s*0|outline:\s*none/);
});

test('responsive styles follow the guide breakpoints and preserve activity behavior', () => {
    assert.match(css, /@media \(max-width: 53rem\)/);
    assert.match(css, /@media \(max-width: 42rem\)/);
    assert.match(page, /onClick=\{clearHistory\}/);
    assert.match(page, /onClick=\{loadMore\}/);
    assert.match(page, /currentFilters\.type/);
    assert.match(page, /currentFilters\.range/);
    assert.match(page, /currentFilters\.sort/);
    assert.match(page, /aria-current="page"/);
});
