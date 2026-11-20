import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');

test('instant approval is validated on the existing admin-only endpoint and opt-in', () => {
    const request = read('app/Http/Requests/Admin/ImportPmpExamQuestionsRequest.php');
    const controller = read('app/Http/Controllers/Admin/PmpExamBankController.php');
    const importer = read('app/Services/Exam/PmpQuestionImporter.php');
    const routes = read('routes/web.php');
    assert.match(request, /'activate_all' => \['sometimes', 'boolean'\]/);
    assert.match(controller, /\$request->boolean\('activate_all'\)/);
    assert.match(importer, /bool \$activateAll = false/);
    assert.match(importer, /\$data\['review_status'\] = \$activateAll \? 'Approved' : \$data\['review_status'\]/);
    assert.match(importer, /\$data\['is_active'\] = \$data\['review_status'\] === 'Approved'/);
    assert.match(routes, /middleware\(\['auth', 'pm.admin', 'verified'\]\)/);
});

test('question uploader distinguishes upload percent from server-side save', () => {
    const page = read('resources/js/pages/admin/PmpQuestionBank.tsx');
    assert.match(page, /checked=\{activateAll\}/);
    assert.match(page, /activate_all: activateAll/);
    assert.match(page, /onProgress: progress =>/);
    assert.match(page, /uploadPercent/);
    assert.match(page, /importStage === 'processing' \? <progress/);
    assert.match(page, /Validating and saving questions/);
    assert.match(page, /onSuccess: \(\) => \{/);
    assert.match(page, /onError: newErrors =>/);
});
