import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { memberSidebarGroups, memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('Careers listing and details have no registered public routes; related features remain', () => {
    const routes = read('routes/web.php');
    assert.doesNotMatch(routes, /Route::[^\n]*['"]\/careers(?:[/'"])/);
    assert.doesNotMatch(routes, /CareerJobsController/);
    assert.match(routes, /career-trends/);
    assert.match(routes, /ai-resume-assistant/);
    assert.match(read('app/Http/Controllers/Careers/CareerJobsController.php'), /class CareerJobsController/);
    assert.match(read('routes/console.php'), /careers:fetch/);
});

test('Careers is removed from live navigation, including saved menu data and search', () => {
    assert.equal(memberSidebarActive('/careers'), undefined);
    assert.ok(memberSidebarGroups.flatMap(g => g.items).every(i => i.id !== 'careers'));
    for (const path of ['resources/js/components/home/v2/HomeSearch.tsx', 'resources/js/components/dashboard/MemberHomeHeader.tsx', 'resources/js/pages/events/Index.tsx']) {
        assert.doesNotMatch(read(path), /['"]\/careers['"]/);
    }
    assert.match(read('app/Support/Admin/SiteNavigation.php'), /! str_starts_with\(\$path, '\/careers\/'\)/);
});
