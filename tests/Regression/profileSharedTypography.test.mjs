import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const profile = read('resources/css/pm-profile.css');
const header = read('resources/js/components/profile/ProfileWorkspaceHeader.tsx');
const rule = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0, `Missing ${selector}`);
    return css.slice(start, css.indexOf('}', start));
};
test('all profile tabs share the same heading and navigation component', () => {
    assert.match(read('resources/js/pages/settings/profile.tsx'), /<ProfileWorkspaceHeader tab=\{currentTab\}/);
    assert.match(read('resources/js/pages/account/ResumeAssistant.tsx'), /<ProfileWorkspaceHeader tab="assistant"/);
    assert.match(header, /pm-profile-top-bar pm-profile-workspace-header/);
    assert.match(header, /pm-profile-nav-tabs pm-member-tertiary-sticky/);
});
test('shared header follows approved semantic typography roles', () => {
    assert.match(rule(profile, '.pm-profile-top-titles h1'), /font: var\(--pm-guide-static-h1-weight\) var\(--text-h1\)\/var\(--line-h1\) var\(--font-ui\)/);
    assert.match(rule(profile, '.pm-profile-top-titles h1'), /letter-spacing: var\(--pm-guide-tracking-h1\)/);
    assert.match(rule(profile, '.pm-profile-top-titles p'), /font: var\(--regular\) var\(--pm-guide-text-lead\)\/var\(--line-body\) var\(--font-ui\)/);
});
test('shared profile tabs use one control role, including weight and line height', () => {
    assert.match(rule(profile, '.pm-profile-tab-item'), /font: var\(--pm-guide-weight-control\) var\(--text-ui\)\/var\(--line-ui\) var\(--font-ui\)/);
    assert.match(rule(profile, '.pm-profile-tab-item'), /min-height: var\(--control-touch\)/);
    assert.match(rule(profile, '.pm-profile-tab-item.is-active'), /color: var\(--primary\)/);
});
test('no overview or editor-specific header typography overrides remain', () => {
    for (const file of readdirSync(new URL('../../resources/css/', import.meta.url)).filter(f=>f.endsWith('.css'))) {
        assert.doesNotMatch(read(`resources/css/${file}`), /\.pm-profile-page--(?:overview|editor)[^{}]*\.pm-profile-(?:top-titles|tab-item|top-actions|top-bar)/, file);
    }
});
