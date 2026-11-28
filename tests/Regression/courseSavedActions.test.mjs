import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberSidebarGroups, memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
import { memberBreadcrumbs } from '../../resources/js/components/dashboard/memberBreadcrumbs.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('weekly study target uses existing spacing token', () => {
    assert.match(read('resources/js/pages/learning/MyLearning.tsx'), /pm-course-study-target/);
    assert.match(read('resources/js/pages/learning/MyLearning.tsx'), /className="pm-my-learning-toolbar"[\s\S]*?pm-course-study-target[\s\S]*?pm-course-workspace-filters/);
    assert.match(read('resources/css/pm-course-workspace.css'), /\.pm-my-learning-toolbar \{ display: grid; gap: var\(--s6\)/);
});
test('course detail uses post icons after title and server save state', () => {
    const detail = read('resources/js/components/learning/CourseDetail.tsx');
    assert.match(detail, /<h1 id="pm-course-detail-title">[\s\S]*?<div className="pm-course-detail-actions"[\s\S]*?<Bookmark size=\{19\} fill=\{saved \? 'currentColor' : 'none'\}[\s\S]*?<Share2 size=\{19\}/);
    assert.match(detail, /aria-pressed=\{saved\} disabled=\{saving\}/);
    const page = read('resources/js/pages/learning/CourseShow.tsx');
    assert.match(page, /method: saved \? 'delete' : 'post'/);
    assert.match(page, /navigator\.clipboard\.writeText\(publicUrl\)/);
    assert.match(page, /new URL\(demoCourseHref\(course.slug\), window.location.origin\)/);
    assert.match(detail, /readOnly value=\{shareLink\}/);
});
test('saved markers use real server state in both course grids', () => {
    for (const path of ['PublicCourseCatalog','CourseWorkspace']) assert.match(read(`resources/js/components/learning/${path}.tsx`), /course.saved && <CourseSavedMarker/);
    assert.match(read('resources/js/components/learning/CourseSavedMarker.tsx'), /<Bookmark size=\{19\} fill="currentColor"/);
    assert.match(read('resources/css/pm-learning-public.css'), /\.pm-course-saved-marker \{ position: absolute; inset-block-start: var\(--s2\); inset-inline-end: var\(--s2\)/);
    assert.match(read('app/Services/Learning/CourseLessonProgress.php'), /where\('user_id', \$user->id\)[\s\S]*?whereColumn\('course_slug', 'learning_courses.slug'\)[\s\S]*?'saved' => \$course->getAttribute\('saved_course_id'\) !== null/);
});
test('saved courses route and sidebar use the authenticated profile and career group', () => {
    const group = memberSidebarGroups.find(g => g.title === 'Profile & career');
    assert.deepEqual(group.items.find(i => i.id === 'saved-courses'), { id:'saved-courses', label:'Saved courses', href:'/saved-courses' });
    assert.equal(memberSidebarActive('/saved-courses?page=2'), 'saved-courses');
    assert.deepEqual(memberBreadcrumbs('/saved-courses').map(c => c.label), ['Home','Profile & career','Saved courses']);
    const routes = read('routes/web.php');
    assert.match(routes, /Route::middleware\(\['auth', 'pm.member', 'verified', 'pm.onboarded'\]\)->group\(function \(\) \{[\s\S]*?Route::get\('\/saved-courses', \[DemoCourseController::class, 'saved'\]\)/);
});
test('saved listing uses bounded member-scoped query and reuses course tile', () => {
    const query = read('app/Domain/Learning/Queries/DemoCourseCatalog.php');
    assert.match(query, /public function savedFor\(User \$user\)[\s\S]*?where\('member_saves.user_id', \$user->id\)[\s\S]*?simplePaginate\(12\)/);
    assert.match(query, /LearningCourse::query\(\)->where\('is_published', true\)/);
    const page = read('resources/js/pages/learning/SavedCourses.tsx');
    assert.match(page, /<CatalogCourseTile/);
    assert.match(page, /router\.delete\(`\$\{demoCourseHref\(course.slug\)\}\/save`/);
    assert.match(page, /<AdjacentPagination/);
    assert.match(page, /onHttpException:/);
    assert.match(page, /onNetworkError:/);
});
