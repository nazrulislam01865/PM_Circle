import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('new course migration preserves legacy slugs and member enrollments', () => {
    const migration = read('database/migrations/2026_11_20_000001_create_learning_courses_table.php');
    assert.match(migration, /Schema::create\('learning_courses'/);
    assert.match(migration, /config\('demo-learning-courses\.courses'/);
    assert.match(migration, /'slug' => \$course\['slug'\]/);
    assert.doesNotMatch(migration, /Schema::dropIfExists\('learning_demo_course_enrollments'\)/);
});

test('course library uses persisted published catalog and gates lesson bodies', () => {
    const query = read('app/Domain/Learning/Queries/DemoCourseCatalog.php');
    const show = read('app/Http/Controllers/Learning/DemoCourseController.php');
    assert.match(query, /LearningCourse::query\(\)->where\('is_published', true\)/);
    assert.match(show, /'body' => \$joined && \$enrolled && \$eligible \? \$lesson\['body'\] : null/);
});

test('admin course CRUD is guarded and paginated', () => {
    const routes = read('routes/web.php');
    const admin = read('app/Http/Controllers/Admin/LearningCourseController.php');
    assert.match(routes, /middleware\(\['auth', 'pm\.admin', 'verified'\]\)/);
    assert.match(routes, /learning-courses\.store/);
    assert.match(routes, /learning-courses\.update/);
    assert.match(admin, /paginate\(15\)->withQueryString\(\)/);
    assert.match(admin, /'is_published' => ! \$course->is_published/);
});

test('course editor matches the existing detail fields and includes add/publish actions', () => {
    const editor = read('resources/js/pages/admin/LearningCourseEditor.tsx');
    for (const field of ['overview', 'objectives', 'outline', 'lessons', 'minutes', 'access_tier', 'thumbnail']) {
        assert.ok(editor.includes(field), `Missing detail field: ${field}`);
    }
    assert.match(editor, /Create course/);
    assert.match(editor, /Publish this course/);
});
