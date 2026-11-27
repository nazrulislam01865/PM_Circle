import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('AI Workspace has nine route-backed menu items and retains existing AI settings', () => {
    const nav = read('resources/js/components/admin/ai/workspace-navigation.ts');
    for (const title of ['AI Overview','AI Providers','API Key Management','AI Models','Feature Configuration','Budget & Token Allocation','Usage & Analytics','Health & Monitoring','Audit Logs']) assert.ok(nav.includes(title));
    const layout = read('resources/js/layouts/admin/AdminLayout.tsx');
    assert.match(layout, /aria-controls="pm-admin-ai-workspace-submenu"/);
    assert.match(layout, /aiWorkspaceLinks.map/);
    assert.match(layout, /aiSettingsLinks.map/);
    assert.match(read('routes/web.php'), /workspace\/\{section\}/);
});
test('stored credentials are encrypted, write-only, pool bound and tested before activation', () => {
    const service = read('app/Domain/AI/Services/AiWorkspaceCredentials.php');
    assert.match(service, /Crypt::encryptString/);
    assert.match(service, /->where\('slot', \$slot\)->lockForUpdate\(\)/);
    assert.match(service, /\$row->health_code === 'OPERATION_VERIFIED'/);
    assert.match(service, /where\('revision', \$row->revision\)/);
    assert.doesNotMatch(service.slice(0, service.indexOf('public function probe')), /secret_encrypted/);
    const runtime = read('app/Domain/AI/Services/AiRuntimeSettings.php');
    assert.match(runtime, /Crypt::decryptString/);
    assert.match(runtime, /config\('pm-ai.'\.\$slot\)/);
    assert.match(read('app/Providers/AiServiceProvider.php'), /->scoped\(/);
});
test('budget, model and usage pages reuse real registries and bounded aggregate queries', () => {
    const controller = read('app/Http/Controllers/Admin/AI/AiWorkspaceController.php');
    assert.match(controller, /->paginate\(25\)/);
    assert.match(controller, /->limit\(25\)/);
    assert.match(controller, /groupByRaw\('DATE\(created_at\), feature_code, provider'\)/);
    assert.match(controller, /'ai.manage_quotas'/);
    assert.match(controller, /'ai_workspace_models'/);
    assert.match(read('app/Domain/AI/Services/AiBudgetService.php'), /->budget\('global_daily_budget_usd'\)/);
    assert.match(read('app/Domain/AI/Services/AiFeatureCatalog.php'), /->allowedModels\(\)/);
});

test('provider creation and configure modal persist approved adapters and preserve active routes', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    const providers = read('app/Domain/AI/Services/AiWorkspaceProviders.php');
    assert.match(page, /Add AI provider/);
    assert.match(page, /Add provider/);
    assert.match(page, /workspace-provider-adapter/);
    assert.match(page, /workspace-credential-provider/);
    assert.match(read('routes/web.php'), /workspace\/providers/);
    assert.match(providers, /ai_workspace_providers/);
    assert.match(providers, /Reassign|reassign active credentials/);
    assert.match(providers, /not implemented/);
});
test('credential accounting reserves from existing global hold and renders real credential costs', () => {
    const service = read('app/Domain/AI/Services/AiBudgetService.php');
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    assert.match(service, /public function reserveCredential/);
    assert.match(service, /where\('b.scope', 'global'\)/);
    assert.match(service, /->lockForUpdate\(\)/);
    assert.match(read('app/Domain/AI/Services/AiExecutionService.php'), /->reserveCredential/);
    assert.match(read('app/Domain/AI/Services/PostCheckBudget.php'), /credential_ref/);
    assert.match(page, /Credential cost breakdown/);
    assert.match(page, /Daily budget \(USD\)/);
});


test('workspace native dialogs load the shared centering and flex layout before workspace overrides', () => {
    const app = read('resources/css/app.css');
    const shared = app.indexOf("@import './pm-career-trend-settings.css';");
    assert.ok(shared >= 0 && shared < app.indexOf("@import './pm-ai-workspace.css';"));
    const css = read('resources/css/pm-career-trend-settings.css');
    assert.match(css, /\.pm-career-settings-dialog\s*\{[^}]*position: fixed;[^}]*inset: 0;[^}]*margin: auto;[^}]*height: fit-content;[^}]*max-height:[^}]*overflow: auto;/);
    assert.match(css, /\.pm-career-settings-dialog-head\s*\{[^}]*display: flex;[^}]*justify-content: space-between;/);
    assert.match(css, /\.pm-career-settings-dialog-actions\s*\{[^}]*display: flex;/);
    assert.match(read('resources/css/pm-ai-workspace.css'), /\.pm-ai-workspace-dialog \.pm-career-settings-dialog-actions\{[^}]*justify-content:flex-end/);
    assert.match(read('resources/js/pages/admin/AiWorkspace.tsx'), /className="pm-career-settings-dialog pm-ai-workspace-dialog"/);
    assert.match(read('resources/js/pages/admin/AiWorkspace.tsx'), /\.showModal\(\)/);
    for (const path of ['resources/js/components/admin/ai/SettingsShared.tsx','resources/js/pages/admin/CareerTrendSettings.tsx']) assert.doesNotMatch(read(path), /import .*pm-career-trend-settings\.css/);
});

test('credential actions cover environment and managed rows with editable pool labels independent of routing', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    assert.match(page, /<input id="workspace-credential-pool" type="text"/);
    assert.match(page, /id="workspace-credential-route" label="Routing target"/);
    assert.doesNotMatch(page, /<AdminChoice id="workspace-credential-pool"/);
    assert.match(page, /credentialActions\(k\)/);
    assert.match(page, /import_environment:true/);
    assert.match(page, /\/environment\/\$\{modal.row.slot\}\/rotate/);
    const controller = read('app/Http/Controllers/Admin/AI/AiWorkspaceController.php');
    assert.match(controller, /public function rotateEnvironment/);
    assert.match(controller, /verified: true/);
    assert.match(read('routes/web.php'), /workspace\/environment\/\{slot\}\/rotate.*admin-ai-workspace-test/);
    const service = read('app/Domain/AI/Services/AiWorkspaceCredentials.php');
    assert.match(service, /\$row->pool_label \?\? AiRuntimeSettings::SLOTS\[\$row->slot\]/);
    assert.match(service, /Crypt::encryptString/);
});

test('workspace prototype header and model actions are backed by real controls', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    for (const label of ['Add provider','Add API key','Add model','Edit global limits','Export CSV','Run health check','Credential cost breakdown','Recent health events','Failure handling']) assert.ok(page.includes(label));
    assert.match(page, /workspace-model-capability.*onChange=\{capability=>setFields/);
    assert.match(read('app/Http/Controllers/Admin/AI/AiWorkspaceController.php'), /Model identifier must match the selected capability/);
});

test('workspace routing controls are connected to persisted routes and request snapshots', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    for (const field of ['primary_credential_id','backup_credential_id','backup_model','strategy','daily_usd']) assert.ok(page.includes(field));
    assert.match(read('routes/web.php'), /workspace\/features\/\{feature\}/);
    assert.match(read('app/Domain/AI/Services/AiBudgetService.php'), /->snapshot\(/);
    const execution = read('app/Domain/AI/Services/AiExecutionService.php');
    assert.match(execution, /routing_snapshot/);
    assert.match(execution, /retrySafe/);
    assert.match(execution, /releaseCredential/);
});
test('monthly and per-feature reservations and direct AI accounting use the same ledger', () => {
    const budget = read('app/Domain/AI/Services/AiBudgetService.php');
    assert.match(budget, /global-month/);
    assert.match(budget, /MONTHLY_AI_BUDGET_REACHED/);
    assert.match(budget, /FEATURE_AI_BUDGET_REACHED/);
    const direct = read('app/Domain/AI/Services/AiDirectUsage.php');
    assert.match(direct, /reserveAmount/);
    assert.match(direct, /reserveCredential/);
    assert.match(direct, /provider_status_unknown/);
    assert.match(read('app/Domain/AI/Services/PostContentCheckService.php'), /AiDirectUsage/);
});
test('workspace models and runtime health use registered adapters and secret-free events', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    for (const label of ['Standby','Embeddings','Vision','Global monthly limit']) assert.ok(page.includes(label));
    const health = read('app/Domain/AI/Services/AiCredentialHealth.php');
    assert.match(health, /credential.runtime.failure/);
    assert.match(health, /credential.runtime.recovered/);
    assert.match(health, /Cache::add/);
    assert.doesNotMatch(health, /secret_encrypted/);
});


test('workspace credential diagnostics use real operation endpoints and existing cost accounting', () => {
    const diagnostic = read('app/Domain/AI/Services/AiCredentialDiagnostic.php');
    assert.match(diagnostic, /->post\('https:\/\/api\.openai\.com\/v1\/responses'/);
    assert.match(diagnostic, /->post\('https:\/\/api\.openai\.com\/v1\/moderations'/);
    assert.doesNotMatch(diagnostic, /->get\('https:/);
    for (const check of ['->begin(', '->settle(', '->reject(', '->unknown(', 'withoutRedirecting()', 'provider_status_unknown']) assert.ok(diagnostic.includes(check));
    assert.match(read('app/Domain/AI/Services/AiWorkspaceCredentials.php'), /AiCredentialDiagnostic::class\)->run/);
    assert.match(read('resources/js/pages/admin/AiWorkspace.tsx'), /Routing target: \{k.routing_target\}/);
});

test('feature configuration shares table columns and preserves every existing action', () => {
    const page = read('resources/js/pages/admin/AiWorkspace.tsx');
    const section = page.slice(page.indexOf("if (section === 'features')"), page.indexOf("if (section === 'budget')"));
    assert.match(section, /<Panel title="Feature routing"[^>]* table>/);
    assert.match(section, /<Table columns=\{\['Feature', 'Primary model \/ key', 'Failover \/ daily limit', 'Status', 'Actions'\]\}/);
    for (const control of ['primaryKey(f)', 'backupKey(f)', 'featureAction(f)', 'Configure route', 'ReviewConnectionTest', "f.enabled ? 'Active' : 'Disabled'"]) assert.ok(section.includes(control), control);
    assert.doesNotMatch(section, /pm-ai-workspace-route[s" ]/);
    const css = read('resources/css/pm-ai-workspace.css');
    assert.match(css, /\.pm-ai-workspace-feature-table table\{[^}]*table-layout:fixed;min-width:/);
    assert.match(css, /\.pm-ai-workspace-feature-actions\{[^}]*justify-content:end/);
    assert.match(css, /\.pm-ai-workspace-feature-actions>\.pm-admin-field\{[^}]*grid-column:1\/-1/);
    assert.match(read('resources/css/pm-admin-ai-usage.css'), /\.pm-ai-admin-table-wrap\{[^}]*overflow-x:auto/);
});
