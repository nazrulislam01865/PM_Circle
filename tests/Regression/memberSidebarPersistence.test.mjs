import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberSidebarActive, memberSidebarContains, memberSidebarGroups } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('desktop sidebar choice survives remount, reload and unavailable storage', async () => {
    const previous = globalThis.window;
    const values = new Map();
    globalThis.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
    try {
        const first = await import('../../resources/js/components/dashboard/sidebarPreference.ts?first');
        assert.equal(first.readSidebarPreference(), false);
        first.writeSidebarPreference(true);
        assert.equal(first.readSidebarPreference(), true);
        const reload = await import('../../resources/js/components/dashboard/sidebarPreference.ts?reload');
        assert.equal(reload.readSidebarPreference(), true);
        reload.writeSidebarPreference(false);
        const next = await import('../../resources/js/components/dashboard/sidebarPreference.ts?next');
        assert.equal(next.readSidebarPreference(), false);
        globalThis.window = { get localStorage() { throw Error('Storage blocked'); } };
        const blocked = await import('../../resources/js/components/dashboard/sidebarPreference.ts?blocked');
        assert.equal(blocked.readSidebarPreference(), false);
        blocked.writeSidebarPreference(true);
        assert.equal(blocked.readSidebarPreference(), true);
        delete globalThis.window;
        const server = await import('../../resources/js/components/dashboard/sidebarPreference.ts?server');
        assert.equal(server.readSidebarPreference(), false);
    } finally {
        if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
    }
    const shell = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
    assert.match(shell, /useState\(readSidebarPreference\)/);
    assert.match(shell, /writeSidebarPreference\(next\)/);
    assert.match(shell, /onToggle=\{toggleSidebar\}/);
    assert.match(shell, /onExpandNavigation=\{navigationCollapsed \? toggleSidebar : undefined\}/);
});

test('exam submenu resolves every existing destination and protects the entire premium group', () => {
    const exam = memberSidebarGroups[0].items.find(item => item.id === 'exams');
    assert.ok(exam.children);
    assert.equal(exam.premium, true);
    assert.deepEqual(exam.children.map(item => item.id), ['pmp', 'scrum']);
    for (const child of exam.children) {
        assert.equal(memberSidebarActive(child.href), child.id);
        assert.ok(memberSidebarContains(exam, child.id));
        assert.equal(child.premium, true);
    }
    assert.equal(memberSidebarActive('/simulators'), 'exams');
    assert.equal(memberSidebarActive('/exams/pmp/attempts/17/review'), 'pmp');
    const sidebar = read('resources/js/components/dashboard/DashboardSidebar.tsx');
    assert.match(sidebar, /aria-expanded=\{expanded\}/);
    assert.match(sidebar, /hidden=\{!expanded\}/);
    assert.match(sidebar, /memberSidebarContains\(item, active\)/);
    assert.match(sidebar, /item\.id === 'resume' \? access\?\.resume : access\?\.examSimulator/);
});

test('collapsed rail retains the logo and only hides the name; mobile drawer keeps its own toggle', () => {
    const css = read('resources/css/pm-member-sidebar-restore.css');
    assert.match(css, /\.is-collapsed \.pm-dash-side-logo \.pm-brand \{ display: inline-flex/);
    assert.match(css, /\.is-collapsed \.pm-dash-side-logo \.pm-brand-copy \{ display: none/);
    assert.match(css, /\.pm-member-sidebar-layout \.pm-member-sidebar-expand \{ display: none/);
    assert.match(css, /\.pm-member-exam-submenu\[hidden\] \{ display: none/);
    assert.match(read('resources/js/components/dashboard/MemberCompactHeader.tsx'), /aria-label="Expand navigation"/);
});

test('member heading roles follow the design guideline rather than oversized or undersized legacy aliases', () => {
    const pmp = read('resources/css/pm-pmp-workspace.css');
    assert.doesNotMatch(pmp, /\.pm-pmp-(history-heading|ai-lead) h2\s*\{[^}]*font-size:\s*var\(--text-h1\)/);
    assert.match(pmp, /\.pm-pmp-workspace h1 \{ font-size:var\(--pm-member-workspace-title\)/);
    assert.match(read('resources/css/pm-member-overview.css'), /\.pm-member-overview-card h2 \{ font: var\(--bold\) var\(--text-h3\)\/var\(--line-h3\)/);
    assert.match(read('resources/css/pm-learning-core.css'), /\.pm-learn-content \.pm-learn-panel-heading h2 \{ font-size: var\(--text-h3\); line-height: var\(--line-h3\)/);
    assert.match(read('resources/css/pm-profile-editor-prototype.css'), /\.pm-prototype-entry-head h4 \{ font-size: var\(--text-h4\)/);
    assert.doesNotMatch(read('resources/css/pm-interview.css'), /\.pm-interview-question h3 \{ font-size: var\(--text-h4\)/);
});
