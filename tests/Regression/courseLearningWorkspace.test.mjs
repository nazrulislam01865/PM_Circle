import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = p => readFileSync(p, 'utf8');
const css = read('resources/css/pm-course-workspace.css');
const tokens = read('resources/css/pm-design-tokens.css');
const controller = read('app/Http/Controllers/Learning/CourseLearningController.php');
const service = read('app/Services/Learning/CourseLessonProgress.php');
const lesson = read('resources/js/pages/learning/Lesson.tsx');
const shared = read('resources/js/components/learning/CourseWorkspace.tsx');
const routes = read('routes/web.php');

test('public and member variants share all workspace components and the original shell', () => {
    for (const path of ['MyLearning', 'Certificates', 'Lesson', 'CertificateShow']) assert.match(read(`resources/js/pages/learning/${path}.tsx`), /CourseWorkspace/);
    assert.match(shared, /<PublicLayout active="\/learning" guideLayout banner=\{\{[^\n]*\}\}>/);
    for (const root of ['/learning', '/dashboard/learning']) {
        for (const path of ['/my-learning', '/certificates', '/courses/{course}/lessons/{lesson}']) assert.ok(routes.includes(`'${root}${path}'`));
        assert.equal(memberSidebarActive(`${root}/courses/agile/lessons/1`), 'learning');
        assert.equal(memberSidebarActive(`${root}/certificates`), 'certificates');
    }
    assert.match(shared, /<progress className="pm-progress"/);
    assert.match(css, /repeat\(3,minmax\(0,1fr\)\)/);
});

test('all text roles refer to defined design tokens and existing shared controls', () => {
    for (const [, token] of css.matchAll(/var\((--[\w-]+)\)/g)) assert.ok(tokens.includes(`${token}:`), token);
    assert.doesNotMatch(css, /font-(?:size|family|weight):\s*(?:[0-9]|["'])/);
    assert.match(lesson, /pm-guide-control/);
    assert.match(lesson, /pm-guide-button/);
    assert.match(css, /@container course-workspace \(max-width: 52rem\)/);
    assert.match(css, /@container course-workspace \(max-width: 31rem\)/);
});

test('public outline cannot serialize gated lesson content, answers, notes or resources', () => {
    const locked = controller.slice(controller.indexOf('if (! $enrolled)'), controller.indexOf('$records = $progress->records'));
    assert.match(locked, /'body' => '', 'key' => ''/);
    assert.match(locked, /'notes' => '', 'question' => null, 'questions' => \[\], 'resources' => \[\]/);
    assert.match(controller, /\$access->ensureEnrolled\(\$request, \$record, \$plans\)/);
    assert.match(controller, /hash_equals\(\$current\['key'\], \$data\['lessonKey'\]\)/);
    assert.match(controller, /get\(\['id', 'prompt', 'options', 'scenario_text', 'scenario_video_url'\]\)/);
    assert.match(lesson, /props.canRead \? <LessonContent/);
});

test('completion is idempotent, scoped and issues certificates only when all current lessons are done', () => {
    assert.match(service, /DB::transaction/);
    assert.match(service, /lockForUpdate\(\)/);
    assert.match(service, /whereNull\('completed_at'\)/);
    assert.match(service, /\$summary\['total'\] > 0 && \$summary\['completed'\] === \$summary\['total'\]/);
    assert.match(service, /DB::table\('learning_course_certificates'\)->insertOrIgnore/);
    assert.match(controller, /where\('user_id', \$request->user\(\)->id\)/);
    const migration = read('database/migrations/2026_11_25_000011_create_course_lesson_progress_and_certificates.php');
    assert.match(migration, /unique\(\['user_id', 'course_id', 'lesson_key'\]/);
    assert.match(migration, /unique\(\['user_id', 'course_id'\]/);
});

test('lesson actions handle server errors without raw Inertia dialogs and no unconfigured AI is called', () => {
    for (const code of ['429','401','419','403','409','422']) assert.ok(lesson.includes(`response.status === ${code}`));
    assert.match(lesson, /lock.current = true/);
    assert.match(lesson, /Accept: 'application\/json'/);
    assert.doesNotMatch(lesson, /Ask AI|lesson-ai-input/);
    assert.match(lesson, /lesson\.faq\.map/);
    assert.match(lesson, /No documents are published for this lesson/);
    assert.match(read('resources/js/pages/learning/CertificateShow.tsx'), /window.print\(\)/);
});
