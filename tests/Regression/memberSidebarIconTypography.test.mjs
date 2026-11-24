import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { memberSidebarGroups } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-member-sidebar-restore.css');
const sidebar = read('resources/js/components/dashboard/DashboardSidebar.tsx');

test('member navigation retains icons in expanded, collapsed and mobile drawer modes', () => {
    assert.match(sidebar, /<Icon className="pm-member-nav-icon"/);
    assert.match(sidebar, /<ClipboardList className="pm-member-nav-icon"/);
    assert.match(css, /\.pm-member-restored-sidebar \.pm-member-nav-icon \{ display: block; flex: 0 0 var\(--icon\); width: var\(--icon\); height: var\(--icon\);/);
    assert.doesNotMatch(css, /\.pm-member-nav-icon\s*\{[^}]*display:\s*none/);
    assert.match(css, /\.is-collapsed \.pm-dash-nav-link span,/);
    assert.match(css, /\.is-collapsed \.pm-dash-side-logo \.pm-brand-copy \{ display: none/);
    assert.deepEqual(memberSidebarGroups[0].items.find(item => item.id === 'exams').children.map(item => item.id), ['pmp', 'scrum']);
});

test('navigation uses one guideline typography rule and legacy breakpoints cannot override it', () => {
    const row = css.match(/\.pm-member-restored-sidebar \.pm-dash-nav-link \{([^}]+)\}/)[1];
    assert.match(row, /font: var\(--regular\) var\(--pm-guide-text-control\)\/var\(--pm-guide-line-control\) var\(--pm-guide-font\)/);
    assert.match(row, /min-height: var\(--control-height\)/);
    assert.match(css, /\.pm-member-sidebar-group > summary \{[^}]*font: var\(--bold\) var\(--pm-guide-text-control\)\/var\(--pm-guide-line-control\) var\(--pm-guide-font\)/);
    assert.match(css, /\.pm-dash-nav-link span \{[^}]*font: inherit/);
    for (const file of ['pm-dashboard-shell.css', 'pm-dashboard-responsive.css']) {
        assert.doesNotMatch(read(`resources/css/${file}`), /\.pm-dash-nav-link\b/, file);
    }
});
