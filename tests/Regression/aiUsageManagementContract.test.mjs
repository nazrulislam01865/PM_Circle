import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('AI usage dashboard is authenticated, admin-only and read-only', () => {
    const routes = read('routes/web.php');
    const controller = read('app/Http/Controllers/Admin/AI/AiUsageDashboardController.php');
    assert.match(routes, /middleware\(\['auth', 'pm\.admin', 'verified'/);
    assert.match(routes, /usage-management', \[\$dashboard, 'index'\]/);
    assert.match(controller, /authorize\(\$request->user\(\), 'ai\.view_reports'\)/);
    assert.match(controller, /authorize\(\$request->user\(\), 'ai\.manage_quotas'\)/);
    assert.match(controller, /orderByDesc\('id'\)->limit\(15\)/);
    assert.doesNotMatch(controller, /payload_encrypted|result_encrypted/);
});

test('admin page reuses existing audited mutation endpoints instead of changing the ledger directly', () => {
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    for (const route of ['/admin/ai/chat-limits/policies', '/admin/ai/chat-limits/overrides', '/admin/ai/allowances', '/admin/ai/credits/grants']) {
        assert.ok(page.includes(route), `Missing ${route}`);
    }
    assert.match(page, /'X-CSRF-TOKEN': token/);
    assert.match(page, /role="progressbar"/);
    assert.match(page, /'reports'/);
});

test('new UI and CSS reuse the approved admin shell and navigation', () => {
    const layout = read('resources/js/layouts/admin/AdminLayout.tsx');
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    const appCss = read('resources/css/app.css');
    assert.match(layout, /AI usage management/);
    assert.match(page, /<AdminLayout/);
    assert.match(appCss, /@import '\.\/pm-admin-ai-usage\.css';/);
    assert.match(page, /'Member usage & overrides'/);
    assert.match(page, /'Reports & audit'/);
});

test('AI permission provisioning demands explicit confirmation and is audited', () => {
    const command = read('app/Console/Commands/AuthorizeAiUsageAdmin.php');
    assert.match(command, /\{--confirm/);
    assert.match(command, /\$this->option\('confirm'\)/);
    assert.match(command, /is_admin', true/);
    assert.match(command, /permission\.grant/);
    assert.match(command, /insertOrIgnore/);
});

test('Plus and Pro have independent plan and credit editors with explicit token labels', () => {
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    const editor = read('resources/js/components/admin/ai/AiAllocationEditors.tsx');
    assert.match(page, /\(\['plus', 'pro'\] as const\)\.map\(plan => <AiPlanPolicyEditor/);
    assert.match(page, /\(\['plus', 'pro'\] as const\)\.map\(plan => capabilities\.credits/);
    assert.match(editor, /plan_code: plan, feature_scope: scope/);
    assert.match(editor, /Tokens \/ billing cycle/);
    assert.match(page, /User-based AI usage and allocation/);
    assert.match(page, /pm-ai-admin-token-summary/);
});

test('feature selector uses existing accessible Radix UI instead of native overlay', () => {
    const editor = read('resources/js/components/admin/ai/AiAllocationEditors.tsx');
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    assert.match(editor, /SelectTrigger aria-label=\{label\}/);
    assert.match(editor, /SelectContent position="popper"/);
    assert.match(page, /<AiFeatureSelect value=\{override\.feature_scope/);
    assert.match(editor, /Ask AI \(general assistant\)/);
});

test('audit reasons remain required but have no eight-character minimum', () => {
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    const editor = read('resources/js/components/admin/ai/AiAllocationEditors.tsx');
    const quotas = read('app/Http/Controllers/Admin/AI/AiQuotaAdminController.php');
    const credits = read('app/Http/Controllers/Admin/AI/AiCreditAdminController.php');
    assert.doesNotMatch(page, /minLength=\{8\}/);
    assert.doesNotMatch(editor, /minLength=\{8\}/);
    assert.doesNotMatch(quotas, /'reason' => \['required', 'string', 'min:8'/);
    assert.doesNotMatch(credits, /'reason' => \['required', 'string', 'min:8'/);
    assert.match(quotas, /'reason' => \['required', 'string', 'max:500'\]/);
    assert.match(credits, /'reason' => \['required', 'string', 'max:500'\]/);
});

test('AI usage refresh uses Inertia reload options supported by the installed router', () => {
    const page = read('resources/js/pages/admin/AiUsageManagement.tsx');
    assert.match(page, /router\.reload\(\{ only: \['totals', 'byFeature', 'policies', 'overrides', 'allowances', 'audit'\] \}\)/);
    assert.doesNotMatch(page, /router\.reload\(\{[^}]*preserveScroll/s);
});
