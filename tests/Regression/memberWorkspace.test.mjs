import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { helpGuides, searchHelpGuides } from '../../resources/js/components/account/helpGuides.ts';
import { memberSidebarActive } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('all six prototype help topics and eighteen searchable step-by-step guides exist', () => {
    assert.deepEqual(helpGuides.map(g=>g.name), ['Account & profile','Courses & learning','Exam simulators','AI tools & resume','Community & events','Payments & membership']);
    assert.equal(helpGuides.flatMap(g=>g.articles).length,18);
    assert.ok(helpGuides.every(g=>g.articles.every(a=>a.steps.length===3)));
    assert.ok(searchHelpGuides('password').flatMap(g=>g.articles).some(a=>a.title==='Reset your password'));
    assert.ok(searchHelpGuides('  PAYMENT  inactive ').length);
    assert.equal(searchHelpGuides('zzzznotfound').length,0);
    assert.equal(searchHelpGuides('').length,6);
});
test('premium member tools use the shared server plan rule rather than a demo override',()=>{
    const routes=read('routes/web.php');
    assert.match(routes,/Route::get\('\/dashboard\/resume-assistant'/);
    assert.match(read('app/Http/Controllers/Account/ResumeAssistantController.php'),/abort_unless\(MemberFeatureAccess::allows/);
    assert.match(read('app/Domain/AI/Services/AiGateway.php'),/MemberFeatureAccess::allowsAi/);
    assert.match(read('app/Domain/Dashboard/Queries/MemberShell.php'),/MemberFeatureAccess::class/);
    assert.equal(memberSidebarActive('/dashboard/resume-assistant'),'resume');
    assert.equal(memberSidebarActive('/help-center/requests/12'),'help');
});
test('usage dashboard reads the real ledger, preserves plan comparison and never substitutes sample quota',()=>{
    const query=read('app/Domain/Billing/Queries/MemberPlanUsage.php');
    assert.match(query,/PmpAiUsageReadModel::class/);
    assert.match(query,/where\('user_id', \$user->id\)/);
    assert.match(query,/SUM\(input_tokens \+ output_tokens\)/);
    assert.match(query,/ai_credit_grants/);
    const page=read('resources/js/pages/billing/PlanUsage.tsx');
    assert.match(page,/\/membership\?view=plans/);
    assert.match(page,/No active PMP token allowance/);
    assert.doesNotMatch(page,/24500|100000|18500/);
});
test('support screenshots are private, owner scoped and submissions deduplicated',()=>{
    const controller=read('app/Http/Controllers/Account/SupportController.php');
    assert.match(controller,/store\('support\/'\.\$user, 'local'\)/);
    assert.match(controller,/\$query->where\('user_id', \$request->user\(\)->id\)/);
    assert.match(controller,/private, no-store/);
    assert.match(controller,/insertOrIgnore/);
    const migration=read('database/migrations/2026_11_24_210001_create_support_request_tables.php');
    assert.match(migration,/unique\(\['user_id', 'submission_key'\]\)/);
    assert.match(read('app/Http/Requests/Support/CreateSupportRequest.php'),/mimes:jpg,jpeg,png,webp/);
});
test('new workspace uses centralized typography and no profile sample stats',()=>{
    const css=read('resources/css/pm-account-workspace.css');
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|font-size:\s*(?:[0-9.]|clamp\()/);
    for(const [,token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(read('resources/css/pm-design-tokens.css').includes(`${token}:`),token);
    assert.doesNotMatch(read('app/Http/Controllers/Settings/ProfileController.php'), /'activities' => 24|'views' => 18|'achievements' => 6/);
});
