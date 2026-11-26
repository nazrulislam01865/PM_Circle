import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page=read('resources/js/pages/account/ResumeAssistant.tsx');
const preview=read('resources/js/components/profile/ResumeDraftPreview.tsx');
const css=read('resources/css/pm-resume-assistant.css');
const controller=read('app/Http/Controllers/Account/ResumeAssistantController.php');
const service=read('app/Domain/Identity/Services/ResumeAssistantProfile.php');
const validation=read('app/Http/Requests/Settings/ResumeAssistantRequest.php');
test('builder uses shared member shell and central UI control roles',()=>{
    assert.match(page,/<MemberDashboardLayout dashboard=\{memberShell\}>/);
    assert.match(page,/<FormField (?:key=\{key\} )?label=/);
    assert.match(preview,/<ProgressBar value=\{score\}/);
    assert.match(page,/<ProfileWorkspaceHeader tab="assistant"/);
    assert.match(css,/var\(--text-h3\)/);
    assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i);
    assert.match(css,/grid-template-columns: minmax\(0,3fr\) minmax\(0,2fr\)/);
    assert.match(css,/@container pm-resume-builder \(max-width: 52rem\)/);
});
test('draft quality and A4 preview are local, preserve additional records and do not truncate text',()=>{
    assert.match(preview,/qualityChecks\(data, document\)/);
    assert.match(preview,/document\[section.id\]/);
    assert.match(page,/<ResumeRepeatableSection/);
    assert.match(service,/private_resume_document/);
    assert.match(css,/min-height: 141\.4286cqi/);
    assert.match(preview,/visiblePages.map/);
    assert.doesNotMatch(preview,/fetch\(|router\.|dangerouslySetInnerHTML/);
});
test('sample and private draft are separated and submission is explicit',()=>{
    assert.match(page,/if \(inFlight\.current \|\| sample\) return/);
    assert.match(page,/disabled=\{busy\|\|sample\|\|stale\}/);
    assert.match(page,/<Dialog open=\{submitConfirm\}/);
    assert.match(controller,/Crypt::encryptString/);
    assert.match(controller,/session\(\)->forget\(\$key\)/);
    assert.match(service,/hash_equals/);
    assert.match(service,/DB::transaction/);
    assert.doesNotMatch(service,/->delete\(|->truncate\(/);
    assert.match(validation,/MemberFeatureAccess::allows/);
});
test('import and AI reuse existing private backend paths with explicit consent',()=>{
    const ai=read('resources/js/components/profile/ResumeAiReview.tsx');
    assert.match(page,/fetch\('\/dashboard\/resume-assistant\/extract'/);
    assert.match(page,/response.status===429/);
    assert.match(page,/setCv\(\{\.\.\.baseCv,\.\.\.extracted.document\}\)/);
    assert.match(page,/\<ResumeAiReview/);
    assert.match(ai,/fetch\('\/ai\/requests'/);
    assert.match(ai,/accepted_max_credits:selected\.credits/);
    assert.match(ai,/client_request_key:requestKey\.current/);
    assert.match(ai,/!consent/);
    assert.match(ai,/Use suggestion in draft/);
});
test('actual résumé template section order and private persistence contract',()=>{
    const form=read('resources/js/components/profile/resumeFieldSchema.ts');
    const document=read('app/Domain/Identity/Services/ResumeDocument.php');
    const model=read('app/Models/Profile.php');
    const exportView=read('resources/views/profile/resume-export.blade.php');
    const exporter=read('app/Domain/Identity/Services/ResumeExport.php');
    const ids=['education','experience','research','projects','skills','achievements','interests','languages','certifications'];
    assert.deepEqual([...form.matchAll(/\{ id: '([^']+)', title:/g)].map(m=>m[1]),ids);
    for(const id of ids){assert.ok(document.includes(`'${id}' =>`));assert.ok(exporter.includes(`'${id}' =>`));}
    assert.match(model,/\$hidden = \['private_resume_document'\]/);
    assert.match(model,/'private_resume_document' => 'encrypted:array'/);
    assert.match(exportView,/@page \{ size: A4/);
    assert.match(read('app/Http/Controllers/Settings/ProfileController.php'),/\$user->hasVerifiedEmail\(\) \|\| \$user->onboarding_step < 3/);
});
