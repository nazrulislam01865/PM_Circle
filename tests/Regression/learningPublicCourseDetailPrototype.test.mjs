import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/learning/CourseShow.tsx');
const courseComponents = read('resources/js/components/learning/CourseDetail.tsx');
const appCss = read('resources/css/app.css');
const learningCss = read('resources/css/pm-learning.css');
const oldCss = read('resources/css/pm-learning-course-detail.css');

test('shared course detail retains public and member shells and renders all sections', () => {
    assert.match(page, /return <PublicLayout siteLayout=\{!memberView\} active="\/learning" banner=\{\{[^\n]*\}\}>/);
    assert.doesNotMatch(page, /<PublicCourseDetail|pm-course-public|guideLayout/);
    assert.match(page, /<CourseDetailHero course=\{course\}/);
    assert.match(page, /<CourseDetailTabs onChange=\{jump\}/);
    assert.match(page, /<CourseDetailOverview course=\{course\}/);
    assert.match(page, /<CourseDetailCurriculum course=\{course\}/);
    assert.match(page, /<CourseAccessCard course=\{course\}/);
    assert.match(page, /<CourseProviderCard\s*\/>/);
});

test('restoration retains original access controls, study tools, and server enrollment', () => {
    assert.match(page, /const canRead = isMember && enrolled && eligible/);
    assert.match(page, /router\.post\(`\$\{url\}\/enroll`/);
    assert.match(page, /router\.visit\(`\$\{demoCourseHref\(course\.slug\)\}\/save`/);
    assert.match(page, /const memberView = usePage\(\)\.url\.split/);
    for (const name of ['CourseDetailPracticePanel', 'CourseDetailResourcesPanel', 'CourseDetailExtraPanel']) {
        assert.ok(page.includes(`<${name}`), `${name} must remain available`);
    }
    assert.doesNotMatch(page, /tab ===/);
    const order = ['<CourseDetailOverview', '<CourseDetailCurriculum', '<CourseDetailPracticePanel', 'active="reviews"', 'active="questions"', '<CourseDetailResourcesPanel'];
    for (let i = 1; i < order.length; i++) assert.ok(page.indexOf(order[i-1]) < page.indexOf(order[i]));
    assert.match(page, /scrollIntoView/);
});

test('the original course detail CSS remains loaded without loading the replaced design', () => {
    assert.match(oldCss, /\.pm-course-detail-grid/);
    assert.match(courseComponents, /export function CourseDetailHero|function CourseDetailHero/);
    assert.match(learningCss, /@import '\.\/pm-learning-course-detail\.css';/);
    assert.match(appCss, /@import '\.\/pm-learning\.css';/);
    assert.doesNotMatch(appCss, /@import '\.\/pm-learning-course-public\.css';/);
});

test('prototype styles use existing central roles and shared guide controls', () => {
    const tokens = read('resources/css/pm-design-tokens.css') + read('resources/css/pm-member-sidebar-restore.css');
    for (const [, name] of oldCss.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${name}:`), name);
    assert.match(oldCss, /var\(--pm-guide-text-course-title\)/);
    assert.match(oldCss, /var\(--pm-guide-text-h3\)/);
    assert.match(oldCss, /var\(--pm-guide-text-body\)/);
    assert.match(oldCss, /@container course-detail/);
    assert.doesNotMatch(oldCss, /font-(?:size|weight|family):\s*(?:[0-9]|["'])/);
    assert.match(courseComponents, /pm-guide-button is-outline/);
    assert.match(courseComponents, /pm-guide-control/);
    assert.match(courseComponents, /onError=\{event =>/);
});

test('guests see public overview and illustrative samples, not protected practice or downloads', () => {
    assert.match(courseComponents, /isMember && <button/);
    assert.match(courseComponents, /practice.enabled \? canRead \?/);
    assert.match(courseComponents, /canRead \? <a href=\{`\/learning\/courses/);
    assert.match(courseComponents, /not the scored question bank/);
    assert.match(courseComponents, /not actual learner feedback/);
    const controller = read('app/Http/Controllers/Learning/DemoCourseController.php');
    assert.match(controller, /! \$member->is_admin && \$member->status === 'active'/);
    assert.match(controller, /'body' => \$joined && \$enrolled && \$eligible \? \$lesson\['body'\] : null/);
    assert.match(controller, /\$catalog->findPublished\(\$course\)/);
    assert.doesNotMatch(controller, /LearningCourse::query\(\)/);
});

test('course mutations handle HTTP and network errors and share the public URL', () => {
    for (const code of [429,401,419,403,404]) assert.ok(courseComponents.includes(`status === ${code}`));
    for (const source of [page,courseComponents]) {
        assert.match(source, /onHttpException: response => [^\n]*return false/);
        assert.match(source, /onNetworkError:/);
    }
    assert.match(page, /actionLock.current = true/);
    assert.match(courseComponents, /lock.current = true/);
    assert.match(page, /new URL\(demoCourseHref\(course.slug\), window.location.origin\)/);
});
