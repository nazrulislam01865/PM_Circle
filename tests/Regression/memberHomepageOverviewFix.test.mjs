import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberBreadcrumbs } from '../../resources/js/components/dashboard/memberBreadcrumbs.ts';
import { needsProfileCompletionRefresh, rememberProfileCompletion } from '../../resources/js/components/dashboard/profileCompletionSnapshot.ts';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('Home omits redundant breadcrumb without changing descendant or community trails', () => {
    for (const url of ['/', '/dashboard', '/dashboard/home', '/dashboard?tab=following']) assert.deepEqual(memberBreadcrumbs(url), []);
    assert.deepEqual(memberBreadcrumbs('/dashboard?view=community').map(item => item.label), ['Home', 'Community', 'Community feed']);
    assert.equal(memberBreadcrumbs('/settings/profile')[0].href, '/dashboard');
});

test('syllabus card, pending placeholder and unused exam attempt lookup are removed', () => {
    assert.doesNotMatch(read('resources/js/components/dashboard/MemberHomeOverview.tsx'), /syllabus/i);
    assert.doesNotMatch(read('app/Domain/Dashboard/Queries/MemberDashboardStats.php'), /syllabus|pmp_exam_attempts/);
    assert.doesNotMatch(read('resources/js/types/dashboard.ts'), /syllabus/);
    for (const name of ['My profile', 'Earned badges', 'Plan & usage', 'Practice & results', 'Profile insights', 'Your learning', 'Community contribution']) assert.ok(read('resources/js/components/dashboard/MemberHomeOverview.tsx').includes(name));
});

test('profile score refresh is required only for a mismatching score of the same member', () => {
    assert.equal(needsProfileCompletionRefresh(1, 70), false);
    rememberProfileCompletion(1, 80);
    assert.equal(needsProfileCompletionRefresh(1, 70), true);
    assert.equal(needsProfileCompletionRefresh(1, 80), false);
    assert.equal(needsProfileCompletionRefresh(2, 70), false);
    rememberProfileCompletion(1, 60);
    assert.equal(needsProfileCompletionRefresh(1, 80), true);
    assert.equal(needsProfileCompletionRefresh(1, 60), false);
});

test('Home and My Profile keep the server score authoritative and refresh only the identity when stale', () => {
    for (const file of ['app/Domain/Dashboard/Queries/DashboardOverview.php', 'app/Http/Controllers/Settings/ProfileController.php']) assert.match(read(file), /app\(ProfileCompleteness::class\)->scores\(\$user\)/);
    assert.match(read('app/Domain/Identity/Services/ProfileCompleteness.php'), /is_string\(\$skill\) && filled\(\$skill\)/);
    assert.match(read('resources/js/pages/settings/profile.tsx'), /rememberProfileCompletion\(profileData.id, profileData.completeness\)/);
    const home = read('resources/js/pages/account/Dashboard.tsx');
    assert.match(home, /needsProfileCompletionRefresh\(memberId, completion\)/);
    assert.match(home, /only: \['dashboard'\]/);
    assert.match(home, /completionRefreshAttempted.current = true/);
    assert.match(read('resources/js/components/dashboard/MemberHomeOverview.tsx'), /aria-valuenow=\{member.completion\}/);
});

test('wide Home rail stays top-pinned during feed scrolling; the grid end releases it without another scrollbar', () => {
    const css = read('resources/css/pm-member-body.css');
    const block = css.slice(css.indexOf('@container member-workspace (width > 53.125rem)'), css.indexOf('@container member-workspace (max-width: 53.125rem)'));
    assert.match(block, /--pm-home-overview-top: calc\(var\(--header-height\) \+ var\(--pm-member-offer-top, 0px\) \+ var\(--s4\)\)/);
    assert.match(block, /top: var\(--pm-home-overview-top\)/);
    assert.doesNotMatch(block, /overflow|max-height|scrollbar|overview-offset/);
    assert.match(css, /@container member-workspace \(max-width: 53\.125rem\)[\s\S]*?\.pm-dash-right \{\s*position: static/);
    const home = read('resources/js/pages/account/Dashboard.tsx');
    assert.doesNotMatch(home, /attachHomeOverviewSticky|overviewRef/);
    assert.match(home, /aria-label="Member overview">/);
});
