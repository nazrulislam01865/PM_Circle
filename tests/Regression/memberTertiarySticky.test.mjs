import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-member-navigation.css');

const pages = [
    ['Scenario Library', 'resources/js/pages/scenarios/Index.tsx', 'pm-challenge-tabs'],
    ['My profile', 'resources/js/components/profile/ProfileWorkspaceHeader.tsx', 'pm-profile-nav-tabs'],
    ['PMP simulator dashboard', 'resources/js/components/exam/PmpWorkspacePanels.tsx', 'pm-pmp-tabs'],
];

for (const [name, file, baseClass] of pages) {
    test(`${name} uses the shared sticky third-level navigation class`, () => {
        const source = read(file);
        assert.match(source, new RegExp(`className="${baseClass} pm-member-tertiary-sticky"`));
        assert.equal((source.match(/pm-member-tertiary-sticky/g) ?? []).length, 1);
    });
}

test('member tabs remain below the existing primary and secondary navigation', () => {
    assert.match(css, /\.pm-member-shell \.pm-member-tertiary-sticky\s*\{[^}]*position:\s*sticky;[^}]*top:\s*calc\(var\(--header-height\) \+ var\(--pm-member-secondary-height\)\);/s);
    assert.match(css, /:is\(\.pm-member-shell, \.pm-member-exam-navigation\)\s*>\s*\.pm-member-secondary\s*\{/);
});

test('public Scenario Library tabs remain below the public header', () => {
    assert.match(css, /\.pm-page-shell \.pm-member-tertiary-sticky\s*\{[^}]*position:\s*sticky;[^}]*top:\s*var\(--header-height\);/s);
});

test('sticky tabs retain centralized backgrounds instead of changing theme', () => {
    assert.match(css, /\.pm-member-tertiary-sticky:is\(\.pm-challenge-tabs, \.pm-profile-nav-tabs\)\s*\{[^}]*background:\s*var\(--canvas\);/s);
    assert.match(css, /\.pm-member-tertiary-sticky\.pm-pmp-tabs\s*\{[^}]*background:\s*var\(--surface\);/s);
});

test('Community feed sticky controls and their offset are unchanged', () => {
    const base = read('resources/css/pm-member-shell.css');
    assert.match(base, /\.pm-member-shell \.pm-dash-feed-sticky-controls\s*\{[^}]*position:\s*sticky;/s);
    assert.match(css, /\.pm-member-shell \.pm-dash-feed-sticky-controls,[\s\S]*?top:\s*calc\(var\(--header-height\) \+ var\(--pm-member-secondary-height\)\)/);
});
