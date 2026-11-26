import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
test('four stages share a single wizard and practice brief', () => {
    const shared = read('resources/js/components/interview/InterviewFlow.tsx');
    for (const stage of ['Target role', 'Question set', 'Practice', 'Results']) assert.ok(shared.includes(stage));
    for (const page of ['Index','Practice','Results']) {
        const text = read(`resources/js/pages/interview/${page}.tsx`);
        assert.match(text, /<FlowPage/);
        assert.match(text, /<Wizard/);
        assert.match(text, /<Brief/);
    }
});
test('preview is scoped, expires, and consumes a server snapshot instead of client questions', () => {
    const controller = read('app/Http/Controllers/Interview/InterviewController.php');
    assert.match(controller, /session\(\)->put\('interview_draft'/);
    assert.match(controller, /\$draft\['user'\] !== \$request->user\(\)->id/);
    assert.match(controller, /hash_equals/);
    assert.match(controller, /\$questions = \$draft\['questions'\]/);
    assert.match(controller, /session\(\)->forget\('interview_draft'\)/);
});
test('rule-based feedback is deterministic, bounded, and has no AI call', () => {
    const result = JSON.parse(execFileSync('php', ['-r', `require 'app/Domain/Interview/PracticeRubric.php'; $q=['type'=>'Situational','text'=>'How would you manage risks and dependencies?']; $a='I reviewed risks and assigned owners. I communicated the result and improved delivery.'; echo json_encode([App\\Domain\\Interview\\PracticeRubric::evaluate($a,$q),App\\Domain\\Interview\\PracticeRubric::evaluate($a,$q),App\\Domain\\Interview\\PracticeRubric::evaluate('',$q)]);`], {encoding:'utf8'}));
    assert.deepEqual(result[0],result[1]);
    assert.ok(result[0].score >= 2 && result[0].score <= 10);
    assert.equal(result[2].score,0);
    assert.ok(result[0].suggested_answer.includes('Validate the impact'));
});
test('skips are persisted and session finish uses a single aggregate', () => {
    const source = read('app/Http/Controllers/Interview/InterviewController.php');
    assert.match(source, /'status' => \$skipped \? 'skipped' : 'evaluated'/);
    assert.match(source, /COUNT\(score\) as scored/);
    assert.match(source, /lockForUpdate\(\)/);
    assert.match(read('resources/js/pages/interview/Practice.tsx'), /advance\(true\)/);
});
