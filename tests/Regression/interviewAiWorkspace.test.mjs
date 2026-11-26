import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
test('interview review is registered, disabled by default, and reuses workspace settings', () => {
    for (const file of ['app/Domain/AI/Services/AiFeatureCatalog.php','app/Domain/AI/Services/AiFeatureRouting.php','app/Http/Controllers/Admin/AI/AiWorkspaceController.php','resources/js/pages/admin/AiWorkspace.tsx']) assert.match(read(file), /interview_answer_review/);
    assert.match(read('database/migrations/2026_11_26_000004_connect_interview_ai_review.php'), /'enabled' => false/);
    assert.match(read('config/pm-interview.php'), /'ai_feedback_enabled' => false/);
});
test('only consented saved answers can be sent and repeated admission returns same receipt', () => {
    const ctx=read('app/Domain/Interview/InterviewAiReview.php');
    assert.match(ctx, /where\('s.user_id', \$user->id\)/);
    assert.match(ctx, /if \(! \$consent\)/);
    assert.match(ctx, /hash_equals\(self::revision/);
    const gateway=read('app/Domain/AI/Services/AiGateway.php');
    assert.match(gateway, /existing_review_id/);
    assert.match(gateway, /ai_review_request_id' => \$requestId/);
    assert.match(gateway, /\$this->credits->reserve/);
    assert.match(gateway, /ExecuteAiRequest::dispatch/);
});
test('saved revisions are stable and distinguish changed text and answer mode', () => {
    const output=JSON.parse(execFileSync('php',['-r',`require 'app/Domain/Interview/InterviewAiReview.php'; $c=App\\Domain\\Interview\\InterviewAiReview::class; echo json_encode([$c::revision('one','type'),$c::revision('one','type'),$c::revision('two','type'),$c::revision('one','speak')]);`],{encoding:'utf8'}));
    assert.equal(output[0], output[1]); assert.notEqual(output[0], output[2]); assert.notEqual(output[0], output[3]); assert.equal(output[0].length,64);
});
test('queued execution checks current answer and feature status; scoring stays local', () => {
    const execution=read('app/Domain/AI/Services/AiExecutionService.php');
    assert.match(execution, /existing_review_id.*request->id/);
    assert.match(execution, /FEATURE_DISABLED/);
    assert.match(execution, /Do not assign or change a practice score/);
    const controller=read('app/Http/Controllers/Interview/InterviewController.php');
    assert.match(controller, /PracticeRubric::evaluate/);
    assert.match(controller, /'ai_review_request_id' => null/);
    assert.match(controller, /leftJoin\('ai_requests as r'/);
});
test('member explicitly accepts cost and consent; prior feedback is read from central status endpoint', () => {
    const ui=read('resources/js/components/interview/InterviewAiReview.tsx');
    assert.match(ui, /accepted_max_credits: offer.credits/);
    assert.match(ui, /disabled=\{!consent \|\| busy\}/);
    assert.match(ui, /answer_revision: answer.revision/);
    assert.match(ui, /provider_status_unknown/);
    assert.match(read('resources/js/pages/interview/Results.tsx'), /expanded\[i\] && a\?\.status/);
});
