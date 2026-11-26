import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('all four AI settings share the Career Trends connection card and dialog controls', () => {
    const ui = read('resources/js/components/admin/ai/ConnectionControls.tsx');
    for (const name of ['pm-career-settings-integration', 'pm-career-settings-provider', 'pm-career-settings-status', 'pm-career-settings-dialog-actions', 'pm-admin-button-primary', 'pm-admin-button-quiet']) assert.ok(ui.includes(name));
    assert.match(ui, /<AdminChoice/);
    assert.match(ui, /disabled=\{testing \|\| retrySeconds > 0 \|\| routingBusy \|\| testDisabled \|\| connection.configured === false\}/);
    assert.match(ui, /fixed \? 'Close' : 'Use selection'/);
    for (const file of ['resources/js/components/admin/ai/SettingsShared.tsx', 'resources/js/pages/admin/CareerTrendSettings.tsx']) {
        const source = read(file);
        assert.match(source, /<IntegrationCard/);
        assert.match(source, /<ConnectionDialogContent/);
        assert.match(source, /while \(result.pending/);
        assert.match(source, /rateLimited\(poll\)/);
    }
});
test('feature generation diagnostics use existing queue, budget and actor-owned receipts without publishing', () => {
    const service = read('app/Domain/AI/Services/FeatureConnectionStatus.php');
    assert.match(service, /'subject_type' => 'feature_connection_test'/);
    assert.match(service, /->lockForUpdate\(\)/);
    assert.match(service, /AiBudgetService::class\)->reserve/);
    assert.match(service, /ExecuteAiRequest::dispatch\(\$id\)/);
    assert.match(service, /where\('subject_id', \$actorId\)/);
    assert.match(service, /where\('client_key', \$fingerprint\)/);
    assert.match(service, /provider_status_unknown/);
    assert.doesNotMatch(service, /DB::table\('(ai_editorial_drafts|pmp_exam_attempts|pmp_exam_questions)'\)/);
    assert.match(read('app/Domain/AI/Services/AiExecutionService.php'), /FeatureConnectionStatus::class\)->assertCurrent/);
    assert.match(read('routes/web.php'), /feature-connection\/\{feature\}\/\{uuid\}/);
});
test('feed diagnostics use actual Omni moderation and do not send unbudgeted Responses requests', () => {
    const service = read('app/Domain/AI/Services/FeatureConnectionStatus.php');
    const feed = service.slice(service.indexOf('private function testFeed'));
    assert.match(feed, /primaryAccounting\('feed_moderation'/);
    assert.match(feed, /\$credentials->testEnvironment/);
    assert.match(read('app/Domain/AI/Services/AiCredentialDiagnostic.php'), /->begin\(/);
    assert.match(service, /'verification' => \$this->verification/);
});
