import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('learning dropdowns come from master data, not hardcoded course choices', () => {
    const editor = read('resources/js/pages/admin/LearningCourseEditor.tsx');
    const content = read('resources/js/pages/admin/LearningCourseContent.tsx');
    const controller = read('app/Http/Controllers/Admin/LearningCourseController.php');
    const contentController = read('app/Http/Controllers/Admin/LearningCourseContentController.php');
    assert.match(controller, /CourseMasterData::options/);
    assert.match(contentController, /CourseMasterData::options/);
    assert.match(editor, /dropdowns\.course_category/);
    assert.match(editor, /dropdowns\.course_access/);
    assert.match(content, /course_question_kind/);
    assert.match(content, /course_question_difficulty/);
    assert.match(content, /course_resource_kind/);
    assert.doesNotMatch(editor, /const categories = \[/);
});

test('course dropdown controls share accessible styled Radix component and central tokens', () => {
    const choice = read('resources/js/components/admin/AdminChoice.tsx');
    const css = read('resources/css/pm-admin.css');
    assert.match(choice, /@radix-ui\/react-select/);
    assert.match(choice, /SelectPrimitive\.Trigger/);
    assert.match(choice, /SelectPrimitive\.Item/);
    assert.match(css, /\.pm-admin-choice-trigger/);
    assert.match(css, /var\(--control-height\)/);
    assert.match(css, /var\(--blue-soft\)/);
    assert.match(css, /\.pm-course-resources-layout/);
});

test('new master values are seeded and semantic identifiers remain constrained', () => {
    const migration = read('database/migrations/2026_11_20_000003_add_course_dropdown_master_data.php');
    const catalog = read('app/Support/Admin/HomepageMasterData.php');
    const request = read('app/Http/Requests/Admin/SaveLearningCourseRequest.php');
    assert.match(migration, /insertOrIgnore/);
    assert.match(migration, /'course_category'/);
    assert.match(migration, /'course_resource_kind'/);
    assert.match(catalog, /CourseMasterData::GROUPS/);
    assert.match(catalog, /'course_access' => \['free', 'paid'\]/);
    assert.match(request, /Rule::in\(\$choices\['course_category'\]\)/);
});
