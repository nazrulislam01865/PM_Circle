import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/admin/DailyChallenge.tsx');
const controller = read('app/Http/Controllers/Admin/DailyChallenge/DailyChallengeController.php');
const service = read('app/Domain/AI/Services/AiEditorialService.php');
const scheduler = read('routes/console.php');
const choices = read('resources/js/components/admin/AdminMultiChoice.tsx');
test('status table uses server retry allowlist and per-date actions', () => {
    assert.match(controller, /'retryableErrors' => AiEditorialService::SCENARIO_RETRYABLE_ERRORS/);
    assert.match(page, /retryableErrors\.includes/);
    assert.match(page, /Retry generation/);
    assert.match(page, /Retry to archive/);
    assert.match(page, /Publish now/);
    assert.match(page, /Publish to archive/);
    assert.match(page, /rowBusy/);
    assert.match(page, /onError: errors => setRowError/);
});
test('historical recovery is opt-in and never reopens a past challenge', () => {
    assert.match(service, /\$manual && \$archiveRecovery/);
    assert.match(service, /ARCHIVE_RECOVERY_NOT_ELIGIBLE/);
    assert.match(service, /'archive_recovery' => true/);
    assert.match(service, /if \(\$expired && ! \$archive\) return null/);
    assert.match(service, /\$archive \|\| \$expires->isPast\(\) \? 'closed'/);
    assert.match(scheduler, /orWhere\('archive_recovery', true\)/);
    assert.match(service, /whereNotIn\('status', \['failed', 'cancelled'\]\)/);
});
test('already generated content needs no new generation key or staff approval', () => {
    const publish = service.split('public function publishAutomatedScenario')[1].split('private function persistScenario')[0];
    assert.doesNotMatch(publish, /isReady\(/);
    assert.match(publish, /GENERATION_NOT_COMPLETED/);
    assert.match(publish, /persistScenario\(\$draft, \$data, null, \$archive\)/);
    assert.match(controller, /public function publishDraft/);
    assert.match(page, /publicationDisabled = !canPublish/);
});
test('guidance uses inline accessible selection rather than a floating multi-choice menu', () => {
    assert.match(page, /AdminMultiChoice inlineList id="daily-domains"/);
    assert.match(page, /AdminMultiChoice inlineList searchable id="daily-topics"/);
    assert.match(choices, /aria-pressed=\{value.includes\(option.value\)\}/);
    assert.match(choices, /onChange\(\[\]\)/);
    assert.match(choices, /value.length >= maxSelections/);
});
