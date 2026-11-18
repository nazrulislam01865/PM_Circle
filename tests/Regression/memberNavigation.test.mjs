import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { memberNavigationForUrl } from '../../resources/js/components/dashboard/memberNavigation.ts';

const state = (path) => memberNavigationForUrl(path);

test('community secondary navigation follows the approved order and uses existing destinations', () => {
    const nav = state('/dashboard?view=community');
    assert.equal(nav.section, 'community');
    assert.equal(nav.active, 'feed');
    assert.deepEqual(nav.secondary.map((link) => link.label), ['Feed', 'Members', 'Topics', 'Saved posts']);
    assert.deepEqual(nav.secondary.map((link) => link.href), [
        '/dashboard?view=community', '/members', '/community?topic=All', '/saved-posts',
    ]);
});

test('community route changes keep primary and secondary active selection consistent', () => {
    for (const [url, active] of [
        ['/community', 'feed'], ['/community?topic=All', 'topics'], ['/members', 'members'],
        ['/members/20', 'members'], ['/saved-posts', 'saved'], ['/posts/25', 'feed'],
        ['/dashboard?tab=all&view=community', 'feed'], ['/dashboard?tab=mine&view=community', 'feed'],
    ]) {
        assert.equal(state(url).section, 'community', url);
        assert.equal(state(url).active, active, url);
    }
});

test('challenge, learning and exams have route-driven secondary navigation', () => {
    const cases = [
        ['/dashboard/daily-challenge', 'challenge', 'library'],
        ['/dashboard/daily-challenge?tab=mine', 'challenge', 'mine'],
        ['/dashboard/daily-challenge/test-scenario', 'challenge', 'library'],
        ['/dashboard/learning?tab=courses', 'learn', 'courses'],
        ['/dashboard/learning?tab=paths', 'learn', 'paths'],
        ['/dashboard/learning?tab=practice', 'learn', 'practice'],
        ['/dashboard/learning/courses/example', 'learn', 'courses'],
        ['/interview-preparation', 'learn', 'interview'],
        ['/exams/pmp?tab=history', 'exams', 'pmp'],
        ['/exams/pmp/attempts/1/result', 'exams', 'pmp'],
        ['/simulators/scrum', 'exams', 'scrum'],
    ];
    for (const [path, section, active] of cases) {
        assert.equal(state(path).section, section, path);
        assert.equal(state(path).active, active, path);
    }
    assert.equal(state('/exams/pmp').secondary.find((item) => item.id === 'ba')?.disabled, true);
});

test('home and settings routes share one menu without inventing endpoints', () => {
    for (const [path, key] of [
        ['/dashboard', 'overview'], ['/settings/profile', 'profile'],
        ['/settings/security', 'settings'], ['/settings/appearance', 'settings'],
        ['/dashboard/features/achievements', 'achievements'],
        ['/activity-log', 'activity'],
    ]) {
        assert.equal(state(path).section, 'home', path);
        assert.equal(state(path).active, key, path);
    }
});

test('Activity Log replaces Profile insights under Home, never under Community', () => {
    const home = state('/activity-log');
    assert.equal(home.section, 'home');
    assert.equal(home.active, 'activity');
    assert.deepEqual(home.secondary.map(item => item.label),
        ['Overview', 'My profile', 'Achievements', 'Activity Log', 'Settings']);
    assert.equal(home.secondary.find(item => item.id === 'activity')?.href, '/activity-log');
    assert.ok(!state('/community').secondary.some(item => item.href === '/activity-log'));
    assert.equal(state('/dashboard/features/insights').section, 'home');
    const root = new URL('../../', import.meta.url);
    const load = path => readFileSync(new URL(path, root), 'utf8');
    const sidebar = load('resources/js/components/dashboard/DashboardSidebar.tsx');
    const overview = load('resources/js/components/dashboard/MemberHomeOverview.tsx');
    assert.match(sidebar, /label: 'Activity Log', href: '\/activity-log'/);
    assert.match(overview, /<Link href="\/activity-log" className="pm-member-overview-link">View activity/);
});

test('Activity Log uses the same authenticated member content frame and shared UI tokens', () => {
    const root = new URL('../../', import.meta.url);
    const load = path => readFileSync(new URL(path, root), 'utf8');
    const css = load('resources/css/pm-activity-log.css');
    const component = load('resources/js/pages/account/ActivityLog.tsx');
    const memberCss = load('resources/css/pm-member-pages.css');
    const shellCss = load('resources/css/pm-member-shell.css');
    assert.match(memberCss, /\.pm-dashboard \.pm-member-public-content > \.pm-container/);
    assert.match(shellCss, /\.pm-member-shell \.pm-dash-body/);
    assert.doesNotMatch(css, /:has\(\.pm-activity-page\)/,
        'Activity Log must not override the shared dashboard body, width or background');
    assert.doesNotMatch(css, /1252px|max-width:\s*none|width:\s*min\(/,
        'Activity Log must not introduce a separate page container width');
    assert.match(component, /className="pm-container pm-page pm-activity-page"/);
    assert.match(css, /var\(--font-ui\)/);
    assert.match(css, /var\(--radius-card\)/);
    assert.match(component, /<h1>Activity Log<\/h1>/);
    assert.match(component, /<ActivitySelect label="Filter by activity type"/);
    assert.match(component, /<ActivityInfo \/>/);
    assert.match(component, /<PublicLayout>/);
});

test('public header stays separate and page-level third-layer tabs remain', () => {
    const root = new URL('../../', import.meta.url);
    const load = (path) => readFileSync(new URL(path, root), 'utf8');
    const header = load('resources/js/components/dashboard/MemberHomeHeader.tsx');
    const shell = load('resources/js/layouts/pm/MemberDashboardLayout.tsx');
    const publicShell = load('resources/js/layouts/pm/PublicLayout.tsx');
    assert.match(header, /memberMode \? <>/);
    assert.match(header, /: <>\s*<Link href=\{isMember/);
    assert.match(shell, /<MemberSecondaryNavigation \/>/);
    assert.doesNotMatch(publicShell, /MemberSecondaryNavigation/);
    assert.match(load('resources/js/components/dashboard/DashboardFeed.tsx'), /<FeedScopeTabs/);
    assert.match(load('resources/js/pages/exam/Index.tsx'), /<PmpWorkspaceTabs/);
    assert.match(load('resources/js/pages/scenarios/Index.tsx'), /<ScenarioLibraryFilters/);
});


test('secondary navigation gives the page body and footer separate grid rows', () => {
    const root = new URL('../../', import.meta.url);
    const load = (path) => readFileSync(new URL(path, root), 'utf8');
    const css = load('resources/css/pm-member-navigation.css');
    const shell = load('resources/js/layouts/pm/MemberDashboardLayout.tsx');
    const app = load('resources/css/app.css');

    // The original member shell's footer occupied row 3. With secondary
    // navigation, the page is row 3 and the footer must be row 4.
    assert.match(css, /\.pm-member-shell \.pm-dash-workspace,[\s\S]*?grid-row:\s*3;/);
    assert.match(css, /\.pm-member-shell\s*>\s*\.pm-unified-footer\s*\{\s*grid-row:\s*4;/);
    assert.match(css, /grid-template-rows:\s*var\(--header-height\)\s+var\(--pm-member-secondary-height\)\s+minmax\(0,\s*1fr\)\s+auto;/);
    assert.match(shell, /<MemberSecondaryNavigation \/>/);
    assert.match(shell, /<SiteFooter \/>/);
    assert.ok(app.lastIndexOf("@import './pm-member-navigation.css';") > app.lastIndexOf("@import './pm-member-shell.css';"),
        'the footer row override must come after the original member shell stylesheet');
});
