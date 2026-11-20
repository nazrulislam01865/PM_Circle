import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('question import preserves its controls without redundant helper paragraphs', () => {
    const page = read('resources/js/pages/admin/PmpQuestionBank.tsx');
    for (const removed of [
        'Approve every imported question and make it available for new exams',
        'Maximum 5 MB · Up to 1,000 questions per file',
        'All 30 fields are preserved. Import is atomic',
    ]) assert.ok(!page.includes(removed), `Unwanted text remains: ${removed}`);
    for (const kept of ['checked={activateAll}', 'chooseImportFile', 'Download Excel template', 'onProgress: progress =>', 'pm-pmp-import-progress', 'pm-pmp-import-error']) {
        assert.ok(page.includes(kept), `Required import control missing: ${kept}`);
    }
});

test('settings retain inputs and use responsive admin tokens and compact sections', () => {
    const page = read('resources/js/pages/admin/PmpQuestionBank.tsx');
    const css = read('resources/css/pm-admin.css');
    for (const key of ['full_question_count', 'full_duration_minutes', 'focused_question_count', 'focused_duration_minutes', 'sample_duration_seconds', 'needs_improvement_below', 'target_below', 'above_target_from', 'sample_question_id', 'shuffle_questions', 'enabled']) {
        assert.ok(page.includes(key), `Exam settings input missing: ${key}`);
    }
    assert.ok(page.includes('pm-pmp-rule-section-sample'));
    assert.ok(page.includes('pm-pmp-settings-footer'));
    assert.match(css, /\.pm-pmp-rule-sections \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(css, /@media \(max-width: 64rem\)/);
    for (const token of ['--border', '--s4', '--radius-card', '--control-compact']) assert.ok(css.includes(token));
});
