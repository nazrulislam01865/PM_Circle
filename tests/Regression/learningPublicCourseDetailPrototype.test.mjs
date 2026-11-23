import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/learning/CourseShow.tsx');
const courseComponents = read('resources/js/components/learning/CourseDetail.tsx');
const appCss = read('resources/css/app.css');
const learningCss = read('resources/css/pm-learning.css');
const oldCss = read('resources/css/pm-learning-course-detail.css');

test('restored course detail renders the original public and member structure', () => {
    assert.match(page, /return <PublicLayout siteLayout=\{!memberView\} active="\/learning">/);
    assert.doesNotMatch(page, /<PublicCourseDetail|pm-course-public|guideLayout/);
    assert.match(page, /<CourseDetailHero course=\{course\}/);
    assert.match(page, /<CourseDetailTabs active=\{tab\}/);
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
    assert.match(page, /tab === 'overview'/);
    assert.match(page, /tab === 'curriculum'/);
    assert.match(page, /tab === 'practice'/);
    assert.match(page, /tab === 'resources'/);
});

test('the original course detail CSS remains loaded without loading the replaced design', () => {
    assert.match(oldCss, /\.pm-course-detail-grid/);
    assert.match(courseComponents, /export function CourseDetailHero|function CourseDetailHero/);
    assert.match(learningCss, /@import '\.\/pm-learning-course-detail\.css';/);
    assert.match(appCss, /@import '\.\/pm-learning\.css';/);
    assert.doesNotMatch(appCss, /@import '\.\/pm-learning-course-public\.css';/);
});
