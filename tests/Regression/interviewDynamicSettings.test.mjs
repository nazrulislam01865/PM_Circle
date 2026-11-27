import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('custom mix quotas always sum to the requested question count', () => {
    const result = JSON.parse(execFileSync('php', ['-r', `require 'app/Domain/Interview/PracticeSettings.php'; $s=App\\Domain\\Interview\\PracticeSettings::defaults(); $s['recommended_common_percent']=35; $s['focus_percent']=50; $s['focus_common_percent']=50; $out=[]; for($n=1;$n<=50;$n++){foreach(['recommended','focus','common'] as $mix){$q=App\\Domain\\Interview\\PracticeSettings::quotas($s,$mix,$n); $out[]=[$n,array_sum($q),min($q)];}} echo json_encode($out);`], { encoding: 'utf8' }));
    for (const [count, sum, min] of result) { assert.equal(sum, count); assert.ok(min >= 0); }
});

test('custom role profiles and private answer guidance use the same server snapshot', () => {
    const result = JSON.parse(execFileSync('php', ['-r', `require 'app/Domain/Interview/PracticeSettings.php'; require 'app/Domain/Interview/PracticeRubric.php'; $s=App\\Domain\\Interview\\PracticeSettings::defaults(); $s['role_profiles']=[['role'=>'Lead','profession'=>'Delivery','focus'=>['capacity']]]; $q=['text'=>'How would you manage capacity?','type'=>'General','answer_guidance'=>'Discuss resource availability.']; echo json_encode([App\\Domain\\Interview\\PracticeSettings::roleProfiles($s,['Lead'=>'Lead','Scrum Master'=>'Scrum Master']),App\\Domain\\Interview\\PracticeSettings::publicQuestions([$q]),App\\Domain\\Interview\\PracticeRubric::evaluate('I would review capacity.',$q)]);`], { encoding: 'utf8' }));
    assert.equal(result[0][0].profession, 'Delivery'); assert.deepEqual(result[0][0].focus, ['capacity']);
    assert.equal(result[0][1].profession, 'Scrum Master'); assert.equal(result[1][0].answer_guidance, undefined);
    assert.equal(result[2].suggested_answer, 'Discuss resource availability.');
});

test('admin configuration is used by member start, preview and AI coaching without a separate catalog', () => {
    const ctrl = read('app/Http/Controllers/Interview/InterviewController.php');
    const admin = read('app/Http/Controllers/Admin/InterviewCatalogController.php');
    const domain = read('app/Domain/Interview/QuestionCatalog.php');
    const page = read('resources/js/pages/interview/Index.tsx');
    assert.match(ctrl, /PracticeSettings::publicQuestions\(\$questions\)/);
    assert.match(ctrl, /\$settings\['allow_new_sessions'\]/); assert.match(ctrl, /\$settings\['allow_job_description'\]/);
    assert.match(admin, /practice_settings/); assert.match(domain, /PracticeSettings::quotas/);
    assert.match(page, /practiceSettings\.mix_labels/); assert.match(page, /practiceSettings\.role_profiles/);
    assert.match(read('app/Domain/Interview/InterviewAiReview.php'), /reference_guidance/);
});

test('prompt publishing uses the central audited version store and detects stale edits', () => {
    const ctrl = read('app/Http/Controllers/Admin/AI/AiManagementController.php');
    assert.match(ctrl, /ai\.manage_prompts/); assert.match(ctrl, /expected_version/);
    assert.match(ctrl, /'prompt\.activate'/); assert.match(ctrl, /'prompt_version' => \$version/);
    const editor = read('resources/js/components/admin/InterviewReviewPrompt.tsx');
    assert.match(editor, /\/admin\/ai\/prompts/); assert.match(editor, /expected_version: prompt\.version/);
    assert.match(read('app/Http/Controllers/Admin/AI/AiWorkspaceController.php'), /interview-preparation\?tab=settings/);
});
