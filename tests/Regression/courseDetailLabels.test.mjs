import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { courseDetailLabels, isExamCourse } from '../../resources/js/components/learning/courseDetailLabels.ts';

const ordinary = { slug: 'stakeholder-management', title: 'Stakeholder Management for Project Success', category: 'Stakeholder & Communication' };
const pmp = { slug: 'pmp-exam-preparation', title: 'PMP Exam Preparation (Complete Course)', category: 'Project Management' };

test('ordinary course type is distinct from its actual catalog category', () => {
    assert.deepEqual(courseDetailLabels(ordinary), { type: 'Professional development', topics: ['Stakeholder & Communication'] });
});
test('PMP course retains the exact prototype badge and topic order', () => {
    assert.deepEqual(courseDetailLabels(pmp), { type: 'Certification preparation', topics: ['Project Management', 'PMP®', 'Exam Preparation'] });
});
test('other exam courses do not get invented PMP topics or repeated exam tags', () => {
    assert.deepEqual(courseDetailLabels({ slug: 'scrum-exam', title: 'Scrum Exam', category: '  exam  preparation ' }), { type: 'Certification preparation', topics: ['exam  preparation'] });
});
test('topic labels cannot duplicate the type badge, even with different case or spacing', () => {
    assert.deepEqual(courseDetailLabels({ ...ordinary, category: ' PROFESSIONAL  DEVELOPMENT ' }), { type: 'Professional development', topics: [] });
    assert.deepEqual(courseDetailLabels({ ...pmp, category: 'Certification preparation' }), { type: 'Certification preparation', topics: ['PMP®', 'Exam Preparation'] });
});
test('empty category and non-exam words do not create misleading labels', () => {
    assert.deepEqual(courseDetailLabels({ ...ordinary, category: '' }), { type: 'Professional development', topics: [] });
    assert.equal(isExamCourse({ ...ordinary, title: 'Project management examples' }), false);
});
test('shared hero consumes the distinct labels without duplicate rendering', () => {
    const hero = readFileSync(new URL('../../resources/js/components/learning/CourseDetail.tsx', import.meta.url), 'utf8');
    assert.match(hero, /const \{ type, topics \} = courseDetailLabels\(course\)/);
    assert.match(hero, /className="pm-course-detail-category">\{type\}/);
    assert.match(hero, /<ul className="pm-course-detail-tags" aria-label="Course topics">\{topics.map/);
    assert.doesNotMatch(hero, /className="pm-course-detail-category">\{[^}]*course.category/);
});
test('all detail roles use central guide typography, card and control tokens', () => {
    const css = readFileSync(new URL('../../resources/css/pm-learning-course-detail.css', import.meta.url), 'utf8');
    assert.match(css, /\.pm-course-detail-summary \{ font: var\(--regular\) var\(--pm-guide-text-body\)\/var\(--pm-guide-line-body\) var\(--pm-guide-font\)/);
    assert.match(css, /\.pm-course-detail-card \{ background: var\(--pm-guide-white\); color: var\(--pm-guide-body-color\)/);
    assert.match(css, /\.pm-course-detail-category \{[^}]*min-height: var\(--pm-guide-button-height\)/);
    assert.match(css, /\.pm-course-resource-item strong \{[^}]*var\(--pm-guide-text-h4\)/);
    assert.doesNotMatch(css, /\.pm-guide-button\.is-outline|font-family:\s*["']|font-size:\s*\d/);
});
