import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('interview catalog is protected by existing admin middleware', () => {
    const routes = read('routes/web.php');
    assert.match(routes, /\['auth', 'pm\.admin', 'verified'\]\)->prefix\('admin'\)/);
    assert.match(routes, /interview-preparation\/questions\/\{question\}/);
    assert.match(routes, /InterviewCatalogController::class/);
});
test('member choices and sessions use the database catalog', () => {
    const controller = read('app/Http/Controllers/Interview/InterviewController.php');
    const request = read('app/Http/Requests/Interview/StartInterviewRequest.php');
    assert.match(controller, /\$catalog->choices\(\)/);
    assert.match(controller, /\$catalog->select\(/);
    assert.match(controller, /'minutes_per_question' => \$minutes/);
    assert.match(request, /array_keys\(\$choices\['industry'\]\)/);
    assert.match(request, /question_set/);
});
test('original question bank and session snapshot survive admin editing', () => {
    const migration = read('database/migrations/2026_11_21_000001_create_interview_admin_catalog.php');
    const source = read('app/Domain/Interview/QuestionCatalog.php');
    assert.match(migration, /QuestionCatalog::starterQuestions\(\)/);
    assert.match(migration, /Schema::table\('interview_sessions'/);
    assert.match(source, /'id' => 'bank-'\.\$question->id/);
    assert.match(source, /ValidationException::withMessages/);
});
test('new admin page uses existing shared CSS and Inter token', () => {
    const css = read('resources/css/pm-interview-admin.css');
    const tokens = read('resources/css/pm-design-tokens.css');
    const style = read('resources/css/app.css');
    assert.match(tokens, /--font-ui:\s*"Inter"/);
    assert.match(css, /var\(--font-ui\)/);
    assert.match(style, /@import '\.\/pm-interview-admin\.css'/);
    assert.match(read('resources/js/layouts/admin/AdminLayout.tsx'), /Interview preparation/);
});


test('interview admin uses centralized choices and exposes safe import/delete', () => {
    const page = readFileSync('resources/js/pages/admin/InterviewCatalog.tsx', 'utf8');
    const controller = readFileSync('app/Http/Controllers/Admin/InterviewCatalogController.php', 'utf8');
    const domain = readFileSync('app/Domain/Interview/QuestionCatalog.php', 'utf8');
    assert.match(page, /AdminChoice/);
    assert.doesNotMatch(page, /<select/);
    assert.match(page, /questions\/import/);
    assert.match(page, /confirmDelete/);
    assert.match(controller, /InterviewQuestionImporter/);
    assert.match(domain, /master_data_options/);
    assert.match(controller, /deleteSet/);
    assert.match(controller, /deleteQuestion/);
    assert.match(controller, /deleteOption/);
});
