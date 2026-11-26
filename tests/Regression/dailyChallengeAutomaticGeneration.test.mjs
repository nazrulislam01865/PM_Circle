import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const controller = read('app/Http/Controllers/Admin/DailyChallenge/DailyChallengeController.php');
const service = read('app/Domain/AI/Services/AiEditorialService.php');
const scheduler = read('routes/console.php');
const page = read('resources/js/pages/admin/DailyChallenge.tsx');
test('admin generation is prominent and publishes automatically after saved opt-in', () => {
    assert.match(page, /Generate Daily Challenge/);
    assert.doesNotMatch(page, /Require editor approval/);
    assert.match(controller, /\$data\['auto_publish'\] = \(bool\) \$data\['enabled'\]/);
    assert.match(controller, /manual: true, actorId:/);
    assert.match(page, /generationNotice/);
});
test('bounded retries only replace the active pointer to a terminal safe request', () => {
    assert.match(service, /whereNotIn\('status', \['failed', 'cancelled'\]\)/);
    assert.match(service, /\$attempts >= 6/);
    assert.match(service, /\$attempts >= 3 \? 180 : 30/);
    assert.match(service, /SCENARIO_RETRYABLE_ERRORS/);
    assert.match(service, /daily_challenge\.draft\.retry/);
    assert.doesNotMatch(service, /->delete\(/);
    assert.match(service, /provider_status_unknown/);
});
test('missing safety configuration prevents admission without bypassing production moderation', () => {
    assert.match(service, /MODERATION_NOT_CONFIGURED/);
    assert.match(service, /environment\('local'\)/);
    assert.match(controller, /Post Check moderation credential/);
});
test('scheduler checks dates independently and does not backfill expired historical slots', () => {
    assert.match(scheduler, /offset <= 1/);
    assert.match(scheduler, /ai:prepare-scenarios'\)->everyFifteenMinutes/);
    assert.match(scheduler, /daily-challenge:publish'\)->everyFiveMinutes/);
    assert.match(scheduler, /catch \(\\App\\Domain\\AI\\Support\\AiFailure/);
    assert.match(service, /PUBLICATION_WINDOW_CLOSED/);
    assert.match(service, /\$day < now\('Asia\/Dhaka'\)->toDateString\(\)/);
    assert.doesNotMatch(scheduler, /Schedule::command\('ai:publish-approved'\)/);
    assert.match(page, /Previous dates and failure history/);
});
