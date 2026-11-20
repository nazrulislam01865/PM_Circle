import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('course practice content is admin-owned, curriculum linked, and retains original public routes', () => {
    const routes = read('routes/web.php');
    assert.match(routes, /middleware\(\['auth', 'pm\.admin', 'verified'\]\)/);
    assert.match(routes, /learning-courses\.questions\.import/);
    assert.match(routes, /learning\.courses\.practice\.start/);
    assert.match(routes, /learning\.courses\.resources\.open/);
    assert.match(routes, /learning\.courses\.show/);
    assert.match(read('app/Http/Requests/Admin/SaveLearningCourseQuestionRequest.php'), /Rule::in\(\$topics\)/);
});

test('new attempts freeze scoring keys while pre-submission payload excludes answer keys', () => {
    const source = read('app/Http/Controllers/Learning/CoursePracticeController.php');
    assert.match(source, /'correct' => \$question->correct_option/);
    assert.match(source, /'questions' => array_map\(static fn \(array \$question\)/);
    assert.match(source, /'expired' : 'submitted'/);
    assert.match(source, /lockForUpdate\(\)/);
    assert.match(source, /where\('is_published', true\)/);
    assert.match(read('app/Services/Learning/CourseAccess.php'), /learning_demo_course_enrollments/);
});

test('course resource downloads are gated and backed by private local storage', () => {
    const resource = read('app/Http/Controllers/Learning/CourseResourceController.php');
    assert.match(resource, /ensureEnrolled/);
    assert.match(resource, /Storage::disk\('local'\)->download/);
    assert.match(read('app/Http/Controllers/Admin/LearningCourseContentController.php'), /'local'/);
});

test('admin cover uses custom preview/upload without a default-cover selector', () => {
    const editor = read('resources/js/pages/admin/LearningCourseEditor.tsx');
    assert.doesNotMatch(editor, /<span>Default cover<\/span>/);
    assert.match(editor, /Course cover preview/);
    assert.match(editor, /accept="image\/jpeg,image\/png,image\/webp"/);
    assert.ok(existsSync(new URL('../../resources/templates/learning-course-questions.xlsx', import.meta.url)));
});
