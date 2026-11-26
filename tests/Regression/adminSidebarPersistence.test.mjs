import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../../resources/js/layouts/admin/AdminLayout.tsx', import.meta.url), 'utf8');

test('admin sidebar retains independent scroll position through page remounts', () => {
    assert.match(layout, /const adminSidebarState = \{\s*scrollTop: 0/);
    assert.match(layout, /sidebar\.scrollTop = adminSidebarState\.scrollTop/);
    assert.match(layout, /adminSidebarState\.scrollTop = sidebar\.scrollTop/);
    assert.match(layout, /<aside ref=\{sidebarRef\}[^>]*onScroll=\{rememberSidebarPosition\} onClickCapture=\{rememberSidebarPosition\}/);
    assert.doesNotMatch(layout, /preserveScroll|scroll-region/);
});

test('all admin groups retain expansion state and active route opens its group', () => {
    for (const [flag, group, setter] of [
        ['isAiWorkspace', 'workspace', 'setWorkspaceOpen'], ['isAi', 'ai', 'setAiOpen'],
        ['isHomepage', 'home', 'setHomeOpen'], ['isMaster', 'master', 'setMasterOpen'],
        ['isNavigation', 'navigation', 'setNavOpen'], ['isPmp', 'pmp', 'setPmpOpen'],
    ]) {
        assert.ok(layout.includes(`useState(() => ${flag} || adminSidebarState.groups.${group})`));
        assert.ok(layout.includes(`if (${flag}) ${setter}(true)`));
    }
    assert.match(layout, /adminSidebarState\.groups = \{ workspace: workspaceOpen, ai: aiOpen, home: homeOpen, master: masterOpen, navigation: navOpen, pmp: pmpOpen \}/);
    assert.match(layout, /!window\.matchMedia\('\(max-width: 45rem\)'\)\.matches/g);
    assert.match(layout, /onClick=\{\(\) => setMobileOpen\(false\)\}/);
});
