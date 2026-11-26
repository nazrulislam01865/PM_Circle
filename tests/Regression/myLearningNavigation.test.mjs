import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberSidebarActive, memberSidebarGroups } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
import { memberBreadcrumbs } from '../../resources/js/components/dashboard/memberBreadcrumbs.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('My Learning removes obsolete paths link and duplicate browse toolbar action', () => {
    const page = read('resources/js/pages/learning/MyLearning.tsx');
    assert.doesNotMatch(page, /Learning paths|tab=paths|<Link/);
    assert.match(page, /CourseWorkspaceEmpty/);
    assert.match(page, /'All courses', 'In progress', 'Completed'/);
    assert.doesNotMatch(read('resources/css/pm-course-workspace.css'), /pm-course-learning-path-link/);
});

test('empty-state Browse courses uses the sidebar catalog destination', () => {
    const browse = memberSidebarGroups.flatMap(group => group.items).flatMap(item => item.children ?? [item]).find(item => item.id === 'courses');
    const shared = read('resources/js/components/learning/CourseWorkspace.tsx');
    assert.ok(shared.includes(`isMember ? <Link href="${browse.href}" className="pm-guide-button">Browse courses</Link>`));
    assert.equal(memberSidebarActive(browse.href), 'courses');
    assert.equal(memberBreadcrumbs(browse.href).at(-1).label, 'Browse courses');
});

test('catalog aliases highlight Browse courses and preserve learning and certificate selection', () => {
    for (const root of ['/learning', '/dashboard/learning']) {
        for (const suffix of ['', '/', '?tab=courses', '?search=agile', '/courses/agile']) assert.equal(memberSidebarActive(root + suffix), 'courses', root + suffix);
        for (const suffix of ['?tab=my-learning', '/my-learning', '/courses/agile/lessons/1']) assert.equal(memberSidebarActive(root + suffix), 'learning', root + suffix);
        for (const suffix of ['?tab=certificates', '/certificates', '/certificates/example']) assert.equal(memberSidebarActive(root + suffix), 'certificates', root + suffix);
    }
    for (const tab of ['paths', 'practice', 'exams']) assert.equal(memberSidebarActive(`/dashboard/learning?tab=${tab}`), 'learning');
});
