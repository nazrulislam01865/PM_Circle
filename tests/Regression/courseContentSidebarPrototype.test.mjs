import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const lesson = read('resources/js/pages/learning/Lesson.tsx');
const css = read('resources/css/pm-course-workspace.css');
const rule = selector => css.split(`${selector} {`)[1]?.split('}')[0] ?? '';

test('outline lesson states use the actual progress and active position', () => {
    assert.match(lesson, /item\.completed \? ' is-completed'/);
    assert.match(lesson, /current \? ' is-active'/);
    assert.match(lesson, /item\.completed && <Check/);
    assert.match(lesson, /item\.completed \? 'Completed'/);
    assert.match(lesson, /<CourseProgress \{\.\.\.status\}/);
    assert.match(lesson, /status\.lessons\.map/);
    assert.match(lesson, /aria-current=\{current \? 'step'/);
    assert.match(rule('.pm-course-lesson-item.is-completed'), /background: var\(--pm-guide-green-bg\); color: var\(--pm-guide-green\)/);
    assert.match(rule('.pm-course-lesson-item.is-active'), /background: var\(--pm-action-blue\)/);
    assert.match(rule('.pm-course-lesson-item.is-completed.is-active'), /border-color: var\(--pm-guide-blue\)/);
});

test('active lesson topics are borderless, conditional and retain their jump targets', () => {
    assert.match(lesson, /item\.position === lesson\.position && <ul className="pm-course-lesson-topics"/);
    assert.match(lesson, /jump\('lesson-reading'\)/);
    assert.match(lesson, /knowledgeChecks\.length > 0 && <li><button[^>]+.*jump\('lesson-check'\)/);
    assert.match(lesson, /!!lesson\.faq\?\.length && <li><button[^>]+.*jump\('lesson-qa'\)/);
    assert.match(rule('.pm-course-lesson-topics button'), /border: 0; background: transparent/);
    assert.match(rule('.pm-course-lesson-topics button'), /min-height: var\(--control-height\)/);
    assert.match(rule('.pm-course-lesson-topics li::before'), /border-radius: var\(--radius-pill\)/);
});

test('panel spacing and lesson geometry use central tokens without changing responsive flow', () => {
    assert.match(rule('.pm-course-lesson-sidebar'), /padding: var\(--pm-guide-card-padding\)/);
    assert.match(rule('.pm-course-lesson-sidebar .pm-course-workspace-progress'), /margin: 0/);
    assert.match(rule('.pm-course-lesson-item'), /border-radius: var\(--radius-control\)/);
    assert.match(css, /@container course-workspace \(max-width: 52rem\).*\.pm-course-lesson-sidebar \{ grid-row: 1;/);
    const locked = lesson.slice(lesson.indexOf('function LockedLesson'));
    assert.match(locked, /<CourseContentLessonLink/);
    assert.doesNotMatch(locked, /pm-course-lesson-topics|<CourseProgress/);
});
