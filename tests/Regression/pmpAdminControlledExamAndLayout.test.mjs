import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('admin rules set exact new mock size and duration without bank-size fallback', () => {
    const controller = source('app/Http/Controllers/Exam/PmpExamController.php');
    assert.match(controller, /'examSize' => \$active >= \$rules\['full_question_count'\]/);
    assert.match(controller, /abort_if\(count\(\$ids\) < \$limit, 409/);
    assert.match(controller, /'fullDurationMinutes' => \$rules\['full_duration_minutes'\]/);
    assert.doesNotMatch(controller, /\$minutes = max\(10, \(int\) ceil\(/);
    assert.doesNotMatch(controller, /min\(\$active, \$rules\['full_question_count'\]\)/);
});

test('admin controls and member dialog display exact settings and low-bank state', () => {
    const admin = source('resources/js/pages/admin/PmpQuestionBank.tsx');
    const dialog = source('resources/js/components/exam/PmpStartExamDialog.tsx');
    const page = source('resources/js/pages/exam/Index.tsx');
    assert.match(admin, /Edit settings/);
    assert.match(admin, /Questions per exam/);
    assert.match(admin, /Duration \(minutes\)/);
    assert.match(dialog, /Mock exam is not ready/);
    assert.match(dialog, /fullDurationMinutes/);
    assert.match(page, /activeQuestionCount=\{activeQuestionCount\}/);
});

test('timed exam remains fully interactive while using compact navigation and design tokens', () => {
    const take = source('resources/js/pages/exam/Take.tsx');
    const css = source('resources/css/pm-exam-simulator.css');
    const navigator = source('resources/js/components/exam/PmpExamNavigator.tsx');
    for (const term of ['ExamTimeProgress', 'PmpExamNavigator', 'persist(id']) {
        assert.ok(take.includes(term), `Missing existing or new exam UI behavior: ${term}`);
    }
    for (const term of ['pm-exam-nav-summary', 'Question Navigator', 'Review Marked Questions']) {
        assert.ok(navigator.includes(term), `Missing shared real-exam navigator behavior: ${term}`);
    }
    assert.match(css, /\.pm-exam-taking \.pm-exam-question-card \{ min-height: 0/);
    assert.match(css, /--radius-control/);
    assert.match(css, /--control-touch/);
});
