import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');

test('four prototype states are componentized and connected to the existing PMP start action', () => {
    const component = source('resources/js/components/exam/PmpStartExamDialog.tsx');
    const page = source('resources/js/pages/exam/Index.tsx');
    for (const label of ['Start a New Mock Exam', 'Past attempts', 'Question bank coverage',
        'New questions only', 'Random question set', 'Some New Questions Are Still Left',
        'Preparing Your Exam', 'Start Mixed Set', 'Start Random Exam']) {
        assert.ok(component.includes(label), `Missing prototype content: ${label}`);
    }
    assert.match(component, /@radix-ui\/react-dialog/);
    assert.match(component, /<StartOption/);
    assert.match(page, /<PmpStartExamDialog/);
    assert.match(page, /const onStart = \(\) =>/);
    assert.match(page, /startDialogPhase === 'ready'/);
    assert.match(page, /startExam\(\{ selection \}\)/);
});

test('mock start is member-scoped with server-enforced new and mixed sets', () => {
    const controller = source('app/Http/Controllers/Exam/PmpExamController.php');
    const service = source('app/Services/Exam/PmpQuestionPool.php');
    const routes = source('routes/web.php');
    assert.match(controller, /function startOptions/);
    assert.match(controller, /\$this->authorizeMember\(\$request, \$plans\)/);
    assert.match(controller, /'selection' => \['sometimes'/);
    assert.match(controller, /whereNotIn\('id', \$used\)/);
    assert.match(controller, /whereIn\('id', \$used\)/);
    assert.match(service, /attempts\.user_id/);
    assert.match(service, /jsonb_array_elements_text/);
    assert.match(routes, /\/exams\/pmp\/start-options/);
});

test('approved question activation does not bypass editorial review', () => {
    const importer = source('app/Services/Exam/PmpQuestionImporter.php');
    const controller = source('app/Http/Controllers/Admin/PmpExamBankController.php');
    const ui = source('resources/js/pages/admin/PmpQuestionBank.tsx');
    assert.match(importer, /\$data\['review_status'\] === 'Approved'/);
    assert.match(controller, /where\('review_status', 'Approved'\)->where\('is_active', false\)/);
    assert.match(ui, /Activate approved questions/);
});

test('dialog consumes shared design tokens and has accessible responsive state', () => {
    const css = source('resources/css/pm-pmp-start-dialog.css');
    assert.match(css, /--pm-guide-text-dialog-title/);
    assert.match(css, /--radius-card/);
    assert.match(css, /--blue-soft/);
    assert.match(css, /--warning-soft/);
    assert.match(css, /--control-touch/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /max-width: 42rem/);
    assert.doesNotMatch(css, /#[0-9a-f]{3,6}\b/i);
});
