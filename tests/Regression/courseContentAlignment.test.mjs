import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('course practice and import use a shared action row separate from input fields', () => {
    const page = read('resources/js/pages/admin/LearningCourseContent.tsx');
    const settings = page.match(/<form onSubmit=\{savePractice\}[\s\S]*?<\/form>/)?.[0];
    const imports = page.match(/<form className="pm-course-content-import"[\s\S]*?<\/form>/)?.[0];
    assert.ok(settings, 'practice settings form must exist');
    assert.ok(imports, 'import form must exist');
    assert.match(settings, /pm-course-content-settings-fields/);
    assert.match(settings, /pm-course-content-actions/);
    assert.match(imports, /pm-course-content-actions/);
    assert.match(settings, /practice\.practice_question_count/);
    assert.match(settings, /practice\.practice_duration_minutes/);
    assert.match(imports, /publishAll/);
    assert.match(imports, /importFile/);
});

test('course layout uses token-based grid, consistent labels, and responsive action alignment', () => {
    const css = read('resources/css/pm-admin.css');
    assert.match(css, /\.pm-course-content-settings,\.pm-course-content-import\{display:grid;gap:var\(--s4\)\}/);
    assert.match(css, /\.pm-course-content-settings-fields\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-course-content-actions\{display:flex;align-items:center;justify-content:space-between/);
    assert.match(css, /\.pm-course-content-stack \.pm-admin-field>span:first-child\{font:var\(--semibold\)/);
    assert.match(css, /\.pm-course-content-filters\{display:grid;grid-template-columns:minmax\(0,2fr\)/);
    assert.match(css, /@media\(max-width:42rem\)\{\.pm-course-content-settings-fields/);
    assert.doesNotMatch(css, /\.pm-course-content-settings\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\) minmax\(12rem,1fr\) auto/);
    assert.doesNotMatch(css, /\.pm-course-content-import\{display:flex/);
});
