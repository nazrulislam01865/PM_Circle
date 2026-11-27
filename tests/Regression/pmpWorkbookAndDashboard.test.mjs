import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('PMP workbook uses all 30 source columns and validates answer consistency before insertion', () => {
    const schema = source('app/Services/Exam/PmpQuestionContent.php');
    const importer = source('app/Services/Exam/PmpQuestionImporter.php');
    for (const label of ['Question ID', 'Exam Domain', 'ECO Task ID', 'ECO Task Focus',
        'Correct Answer', 'Rationale A', 'Rationale B', 'Rationale C', 'Rationale D',
        'PMBOK 8 Performance Domain', 'Reference PDF Page', 'ECO Reference', 'Review Status']) {
        assert.ok(schema.includes(`'${label}'`), `Missing workbook column ${label}`);
    }
    assert.match(importer, /Correct Answer must match Option/);
    assert.match(importer, /'correct_answer_text' => \$isWorkbook \? \$value\('correct_answer'\)/);
    assert.match(importer, /exactly the original 30 columns/);
    const request = source('app/Http/Requests/Admin/SavePmpExamQuestionRequest.php');
    const content = source('app/Services/Exam/PmpQuestionContent.php');
    const migration = source('database/migrations/2026_11_16_060000_preserve_pmp_correct_answer_text.php');
    assert.match(request, /'correct_answer_text' =>/);
    assert.match(content, /\$data\['correct_answer_text'\]/);
    assert.match(migration, /\$table->text\('correct_answer_text'\)/);
    assert.match(importer, /'is_active' => false/);
    assert.match(importer, /DB::transaction/);
    assert.match(importer, /Question Bank values must be plain text/);
});

test('admin editor exposes workbook metadata and keeps drafts out of published questions', () => {
    const editor = source('resources/js/pages/admin/PmpQuestionBank.tsx');
    const controller = source('app/Http/Controllers/Admin/PmpExamBankController.php');
    for (const field of ['ECO Task ID', 'ECO Task Focus', 'Correct Answer', 'Rationale {key}',
        'Reference PDF Page', 'Review Status', 'PMBOK 8 Performance Domain']) {
        assert.ok(editor.includes(field));
    }
    assert.match(editor, /question\.review_status !== 'Approved'/);
    assert.match(controller, /Approve the question before activating it/);
});

test('full mock counters are independent from focused practice and AI overview shares current usage', () => {
    const controller = source('app/Http/Controllers/Exam/PmpExamController.php');
    const panels = source('resources/js/components/exam/PmpWorkspacePanels.tsx');
    const page = source('resources/js/pages/exam/Index.tsx');
    assert.match(controller, /mode = 'full' OR mode IS NULL/);
    assert.match(controller, /mode = 'focused'/);
    assert.match(controller, /'latestScore' => \$latestMockScore/);
    assert.match(panels, /<h2>AI Tokens<\/h2>/);
    assert.match(panels, /aiUsage\.remaining\.toLocaleString/);
    assert.match(page, /aiUsage=\{currentUsage\}/);
});
