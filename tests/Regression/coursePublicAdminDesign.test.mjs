import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
const catalog = read('resources/js/components/learning/PublicCourseCatalog.tsx');
const detail = read('resources/js/pages/learning/CourseShow.tsx');
const components = read('resources/js/components/learning/CourseDetail.tsx');
test('administrator public views share the guest design shell, not member navigation', () => {
    assert.match(layout, /const isPublicView = isGuest \|\| auth\?\.user\?\.is_admin === true/);
    assert.match(layout, /!auth\.user\.is_admin && memberShell/);
    assert.match(layout, /isPublicView && banner && <PublicPageBanner/);
    assert.match(layout, /isPublicView \? ' pm-guest-public-shell'/);
    assert.match(read('resources/js/components/home/v2/HomeHeader.tsx'), /is_admin \? <Link href="\/admin"/);
});
test('only Browse courses uses the shared banner; detail restores the inline title', () => {
    assert.match(catalog, /<PublicLayout[^\n]*memberBanner[^\n]*banner=/);
    assert.doesNotMatch(detail, /<PublicLayout[^\n]*(?:memberBanner|banner=)/);
    assert.match(layout, /memberBanner && banner && <PublicPageBanner/);
    assert.match(layout, /homeHref="\/dashboard"/);
    assert.match(components, /<h1 id="pm-course-detail-title"/);
    assert.doesNotMatch(components, /<LegacyPageHeading>/);
    assert.match(detail, /<nav className="pm-course-detail-breadcrumb"/);
    assert.match(read('resources/css/pm-member-body.css'), /\.pm-sim-banner:not\(\.pm-public-page-banner\)/);
});
test('administrators can preview course outlines without a join or enroll call to action', () => {
    assert.match(detail, /isAdmin=\{isAdmin\}/);
    assert.match(components, /else if \(isAdmin\) \{[\s\S]*?action = null;[\s\S]*?else if \(!isMember\)/);
    assert.match(components, /onClick=\{onViewCurriculum\}/);
    assert.match(read('app/Http/Controllers/Learning/DemoCourseController.php'), /! \$member->is_admin/);
});
