import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const lesson = read('resources/js/pages/learning/Lesson.tsx');
const workspace = read('resources/js/components/learning/CourseWorkspace.tsx');
const css = read('resources/css/pm-course-workspace.css');
const guideCss = read('resources/css/pm-ui-guideline.css');
const detailCss = read('resources/css/pm-learning-course-detail.css');
const rule = selector => css.split(`${selector} {`)[1]?.split('}')[0] ?? '';

test('course name remains the sole workspace heading and lesson count uses metadata', () => {
    assert.equal((lesson.match(/<CourseWorkspace lesson title=\{course.title\} description=\{`Lesson /g) ?? []).length, 2);
    assert.match(workspace, /<h1 className=\{lesson \? 'is-lesson-title' : undefined\}>\{title\}<\/h1>/);
    assert.match(detailCss, /\.pm-course-detail-heading h1, \.pm-course-workspace-heading h1\.is-lesson-title \{[^}]*var\(--pm-guide-text-course-title\)\/var\(--pm-guide-line-h1\)[^}]*letter-spacing: var\(--pm-guide-tracking-h1\)/);
    assert.doesNotMatch(css, /\.pm-course-workspace-heading h1\.is-lesson-title \{/);
    assert.match(rule('.pm-course-workspace-heading.is-lesson-heading p'), /var\(--pm-guide-text-meta\)/);
});
test('lesson content uses section and subordinate typography without changing the sidebar card role', () => {
    for (const heading of ['Overview', 'Knowledge check', 'Apply what you learned', 'My notes', 'Lesson Q&amp;A', 'Lesson documents']) {
        assert.match(lesson, new RegExp(`<h2(?: [^>]+)?>${heading}</h2>`));
    }
    assert.match(lesson, /<h2>\{lesson.title\}<\/h2>/);
    assert.match(lesson, /<h3 className="pm-course-lesson-subheading">\{title\}/);
    assert.match(rule('.pm-course-lesson-main h2'), /var\(--pm-guide-rail-h2\)\/var\(--line-h2\)/);
    assert.match(rule('.pm-course-lesson-main .pm-course-lesson-subheading'), /var\(--text-h4\)/);
    assert.match(rule('.pm-course-workspace :is(h2,h3)'), /var\(--pm-guide-text-h3\)/);
    assert.doesNotMatch(css, /\.pm-course-lesson-reading h2 \{/);
    assert.match(rule('.pm-course-lesson-empty-copy'), /var\(--text-body\)/);
});
test('lesson geometry and controls use centralized spacing and card tokens', () => {
    assert.match(rule('.pm-course-lesson-grid'), /gap: var\(--pm-guide-card-gap\)/);
    assert.match(rule('.pm-course-lesson-main .pm-course-workspace-panel'), /border-radius: var\(--radius-card\); padding: var\(--pm-guide-card-padding\)/);
    assert.match(rule('.pm-course-lesson-main'), /gap: var\(--s6\)/);
    assert.match(guideCss, /\.pm-guide-public-shell \.pm-guide-button \{[^}]*font: var\(--pm-guide-weight-control\)/);
    assert.match(rule('.pm-course-lesson-main details summary'), /min-height: var\(--control-height\)/);
});

test('detail and lesson section navigation share layout, borders, type and responsive wrapping', () => {
    assert.match(detailCss, /:is\(\.pm-course-detail-tabs, \.pm-course-lesson-tabs\) \{ display: flex; gap: var\(--s2\); flex-wrap: wrap; min-width: 0; \}/);
    assert.match(guideCss, /\.pm-guide-public-shell \.pm-guide-button\.is-outline \{[^}]*border-color: var\(--pm-guide-blue\)/);
    assert.match(css, /\.pm-course-workspace \.pm-guide-button\.is-outline:where\(:not\(\.pm-course-lesson-tabs > \.pm-guide-button\)\)/);
    assert.match(detailCss, /:is\(\.pm-course-detail-tabs, \.pm-course-lesson-tabs\) > \.pm-guide-button\.is-active \{ background: var\(--pm-guide-pale\)/);
    assert.match(detailCss, /@container \(max-width: 34rem\) \{\s*:is\(\.pm-course-detail-tabs, \.pm-course-lesson-tabs\) > \.pm-guide-button \{ flex: 1 1 auto; \}/);
    assert.doesNotMatch(css, /^\.pm-course-lesson-tabs(?:[ .]|$)/m);
    assert.match(lesson, /aria-pressed=\{active === id\}/);
});
