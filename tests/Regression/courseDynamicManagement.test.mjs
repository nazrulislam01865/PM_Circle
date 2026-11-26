import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courseDetailLabels} from '../../resources/js/components/learning/courseDetailLabels.ts';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const editor = read('resources/js/pages/admin/LearningCourseEditor.tsx');
const content = read('resources/js/pages/admin/LearningCourseContent.tsx');
const detail = read('resources/js/components/learning/CourseDetail.tsx');
const catalog = read('resources/js/components/learning/PublicCourseCatalog.tsx');
const course = read('app/Http/Controllers/Admin/LearningCourseController.php');
const request = read('app/Http/Requests/Admin/SaveLearningCourseRequest.php');
const resource = read('app/Http/Controllers/Admin/LearningCourseContentController.php');
const lesson = read('app/Http/Controllers/Learning/CourseLearningController.php');
const migration = read('database/migrations/2026_11_26_000005_extend_course_management.php');
test('admin presentation feeds the shared public details and explicit type overrides inferred classification', () => {
    for (const field of ['provider_name','provider_description','faq','practice_examples','tags']) {assert.ok(editor.includes(field));assert.ok(request.includes(field));assert.ok(detail.includes(field) || field === 'tags');}
    const p = {slug:'new-exam-course',title:'New exam course',category:'Agile',presentation:{type:'Professional development',tags:['Agile','Planning','Professional development']}};
    assert.deepEqual(courseDetailLabels(p), {type:'Professional development',topics:['Agile','Planning']});
});
test('catalog filters use published categories and no sample reviews', () => {
    assert.match(catalog, /courses\.map\(course => course.category\)/);
    assert.match(catalog, /course\.category === topic/);
    assert.match(catalog, /answers\[2\]/);
    assert.doesNotMatch(catalog + detail, /sampleMetrics|sample learner|Farhana R\./);
    assert.match(catalog, /const PAGE_SIZE = 4/);
});
test('lecture document assignment uses stable ids, course-scoped validation and private downloads', () => {
    assert.match(migration, /uuid\('lesson_uid'\)->nullable/);
    assert.match(course, /whereIn\('lesson_uid', \$removedIds\)/);
    assert.match(resource, /ensureResourceTarget\(\$locked, \$data\)/);
    assert.match(content, /id="resource-lesson"/);
    assert.match(editor, /Manage lesson documents/);
    assert.match(lesson, /orWhere\('lesson_uid', \$current\['uid'\]\)/);
    assert.match(read('app/Http/Controllers/Learning/CourseResourceController.php'), /ensureEnrolled/);
});
test('lesson association does not affect legacy progress hashes', () => {
    const progress = read('app/Services/Learning/CourseLessonProgress.php');
    assert.match(progress, /\$placement = array_intersect_key/);
    assert.match(progress, /return \[\.\.\.\$lesson, \.\.\.\$placement, 'key'/);
    assert.match(migration, /\$lesson\['uid'\] \?\?=/);
});
test('review approval and aggregate metrics are driven by real learner reviews', () => {
    assert.match(migration, /unique\(\['course_id', 'user_id'\]\)/);
    assert.match(read('app/Http/Controllers/Learning/CourseReviewController.php'), /ensureEnrolled/);
    assert.match(read('app/Http/Controllers/Learning/CourseReviewController.php'), /'is_published' => false/);
    assert.match(read('app/Http/Controllers/Admin/LearningCourseReviewController.php'), /hash_equals/);
    assert.match(read('app/Domain/Learning/Queries/DemoCourseCatalog.php'), /withAvg\(\['reviews as public_rating'/);
});
test('large editor forms use a bounded JSON field and centralized controls', () => {
    assert.match(editor, /course_payload: JSON.stringify/);
    assert.match(request, /JSON_THROW_ON_ERROR/);
    assert.match(editor, /<AdminChoice id=\{`lesson-section-/);
    assert.match(editor, /pm-course-editor-nav/);
    assert.doesNotMatch(editor + content, /<select\b/);
});
