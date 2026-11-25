import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { memberSidebarGroups, memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
import { shouldShowMemberFooter, shouldShowSiteFooter } from '../../resources/js/components/pm/siteFooterVisibility.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('member sidebar contains exactly the four prototype groups, their order and submenu labels', () => {
    assert.deepEqual(memberSidebarGroups.map(g => [g.title, g.items.map(i => i.label)]), [
        ['Learn & practise', ['Courses', 'Exam Simulator', 'Daily challenge']],
        ['Profile & career', ['My profile', 'AI Resume Assistant', 'Interview preparation', 'Achievements']],
        ['Community', ['Community feed', 'Members', 'Saved posts']],
        ['Account', ['Plan & usage', 'Settings', 'Activity log']],
    ]);
    assert.deepEqual(memberSidebarGroups[0].items.find(i => i.id === 'course-group').children.map(i => i.label), ['My learning', 'Browse courses', 'Certificates']);
    assert.deepEqual(memberSidebarGroups[0].items.find(i => i.id === 'exams').children.map(i => i.label), ['PMP exams', 'Scrum / CSM exams']);
    assert.deepEqual(memberSidebarGroups.flatMap(g => g.items).flatMap(i => i.children ?? [i]).filter(i => i.premium).map(i => i.id), ['pmp', 'scrum', 'resume']);
    const sidebar = read('resources/js/components/dashboard/DashboardSidebar.tsx');
    assert.match(sidebar, /id: 'home', label: 'Home', href: '\/dashboard'/);
    assert.match(sidebar, /id: 'help', label: 'Help Centre', href: '\/help-center'/);
    assert.match(sidebar, /props\.memberShell\?\.featureAccess/);
    assert.match(sidebar, /item\.id === 'resume' \? access\?\.resume : access\?\.examSimulator/);
    assert.match(sidebar, /View Plan &amp; usage/);
});

test('every member submenu destination exists in the current routes; active selection is unique', () => {
    const routes = read('routes/web.php') + read('routes/settings.php');
    for (const item of memberSidebarGroups.flatMap(g => g.items).flatMap(i => i.children ?? [i])) {
        const path = item.href.split('?')[0];
        assert.ok(routes.includes(`'${path}'`) || routes.includes(`'${path.slice(1)}'`) || (item.id === 'badges' && routes.includes("'/dashboard/features/{feature}'")), path);
        assert.equal(memberSidebarActive(item.href), item.id, item.href);
    }
    for (const [url, id] of [
        ['/dashboard', 'home'], ['/dashboard?view=community', 'community'], ['/posts/12', 'community'],
        ['/settings/profile?tab=edit', 'profile'], ['/settings/profile?tab=imports', 'profile'],
        ['/exams/pmp/attempts/2/result', 'pmp'], ['/dashboard/daily-challenge/example', 'challenge'],
        ['/scenarios/example', 'challenge'], ['/members/24', 'members'], ['/learning/courses/example', 'courses'],
        ['/help-center', 'help'], ['/contact', 'help'], ['/settings/appearance', 'settings'],
    ]) assert.equal(memberSidebarActive(url), id, url);
    assert.match(read('app/Http/Controllers/Account/AccountFeatureController.php'), /\$feature === 'achievements'/);
    assert.match(read('app/Http/Controllers/Learning/LearningController.php'), /\$request->query\('tab'\) === 'my-learning'/);
});

test('member footer includes exact copyright and policy destinations; public footer and live exam exclusions remain', () => {
    const footer = read('resources/js/components/pm/MemberFooter.tsx');
    assert.match(footer, /© PM Circle by ITQAN/);
    for (const [href, label] of [['/terms','Terms'],['/privacy','Privacy'],['/refund-policy','Refund Policy']]) {
        assert.ok(footer.includes(`href="${href}">${label}</Link>`));
        assert.ok(read('routes/web.php').includes(`'${href}'`));
    }
    assert.match(footer, /Trademark Notice/);
    assert.match(footer, /<DialogDescription>\{trademarkNotice\}/);
    assert.match(read('resources/js/components/home/v2/HomeFooter.tsx'), /\{trademarkNotice\}/);
    assert.equal(shouldShowMemberFooter('/dashboard'), true);
    assert.equal(shouldShowSiteFooter('/dashboard'), false);
    assert.equal(shouldShowMemberFooter('/exams/pmp/attempts/3'), false);
    assert.equal(shouldShowMemberFooter('/admin/overview'), false);
});
