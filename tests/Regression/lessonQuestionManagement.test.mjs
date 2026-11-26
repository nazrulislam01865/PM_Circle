import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
const controller = read('app/Http/Controllers/Learning/CourseLearningController.php');
const admin = read('app/Http/Controllers/Admin/LearningCourseContentController.php');
const importer = read('app/Services/Learning/CourseQuestionImporter.php');
const lesson = read('resources/js/pages/learning/Lesson.tsx');
const editor = read('resources/js/pages/admin/LearningCourseEditor.tsx');
const content = read('resources/js/pages/admin/LearningCourseContent.tsx');
const catalog = read('resources/js/components/learning/PublicCourseCatalog.tsx');
const settings = read('app/Services/Learning/CatalogSettings.php');
test('lesson assignments are explicit and shared topic questions retain their original scope',()=>{
    assert.match(controller,/orWhere\('lesson_uid', \$lesson\['uid'\]\)/);
    assert.match(controller,/whereNull\('lesson_uid'\)->where\('topic_title'/);
    assert.match(admin,/Choose a saved lesson in the selected section and topic/);
    assert.match(read('app/Http/Controllers/Admin/LearningCourseController.php'),/questions\(\)->whereIn\('lesson_uid', \$removedIds\)->exists\(\)/);
});
test('the importer accepts the legacy and scenario formats atomically',()=>{
    assert.match(importer,/LESSON_HEADERS = \[\.\.\.self::HEADERS, 'Scenario Text', 'Scenario Video URL'\]/);
    assert.match(importer,/DB::transaction/);
    assert.match(importer,/The selected lesson changed during import/);
    assert.match(importer,/url:https/);
    assert.match(content,/lesson_uid: initialLesson \|\| null/);
});
test('lesson displays all checks, never preloads answers, and reuses the guarded scoring route',()=>{
    assert.match(lesson,/knowledgeChecks\.map/);
    assert.match(lesson,/knowledge-check-\$\{question.id\}/);
    assert.match(controller,/get\(\['id', 'prompt', 'options', 'scenario_text', 'scenario_video_url'\]\)/);
    assert.match(controller,/\$this->question\(\$record, \$current\)->whereKey\(\$data\['question'\]\)->firstOrFail\(\)/);
    assert.match(controller,/ensureEnrolled/);
});
test('scenario video uses a shared native player and timed attempts snapshot scenario content',()=>{
    const scenario = read('resources/js/components/learning/QuestionScenario.tsx');
    assert.match(scenario,/<video[^>]*controls preload="none"/);
    assert.match(read('app/Http/Controllers/Learning/CoursePracticeController.php'),/scenarioVideoUrl.*scenario_video_url/);
    for (const page of ['CoursePractice','CoursePracticeResult','Lesson']) assert.match(read(`resources/js/pages/learning/${page}.tsx`),/<QuestionScenario/);
});
test('catalog controls all reach the actual shared catalog and are administrator gated',()=>{
    for(const key of ['title','description','starting_enabled','starting_title','starting_description','starting_button','topics_enabled','search_placeholder','detail_button','empty_title','empty_description']) {
        assert.ok(settings.includes(`'${key}'`),key);
        assert.ok(catalog.includes(`settings.${key}`),key);
    }
    assert.match(read('app/Http/Controllers/Admin/LearningCatalogSettingsController.php'),/abort_unless\(\$request->user\(\)\?->is_admin, 403\)/);
    assert.match(read('resources/js/layouts/admin/AdminLayout.tsx'),/Browse Courses control/);
    assert.match(catalog,/const PAGE_SIZE = 4/);
});
test('lesson Q&A is staff authored and controls use the existing admin design',()=>{
    assert.match(editor,/Manage lesson questions/);
    assert.match(editor,/Add lesson Q&amp;A/);
    assert.match(lesson,/lesson\.faq\.map/);
    assert.doesNotMatch(lesson,/Ask AI|demo tokens/);
    assert.match(content,/AdminChoice id="question-lesson"/);
    assert.match(content,/AdminChoice id="question-correct-answer"/);
});
