import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { publishingPreview } from '../../resources/js/components/admin/career-trends/schedule.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const defaults = { timezone: 'Asia/Dhaka', publish_day: '0', publish_time: '09:00', lead_hours: '24' };

test('weekly publishing preview calculates Bangladesh local draft and publish dates', () => {
    const result = publishingPreview(defaults, new Date('2026-11-24T06:00:00Z'));
    assert.equal(result.draft, 'Sat, 28 Nov · 9:00 AM');
    assert.equal(result.publish, 'Sun, 29 Nov · 9:00 AM');
    assert.equal(result.weekStart, '2026-11-23');
});
test('weekly publishing preview skips an elapsed lead-time window', () => {
    const result = publishingPreview(defaults, new Date('2026-11-28T04:00:00Z'));
    assert.equal(result.draft, 'Sat, 5 Dec · 9:00 AM');
    assert.equal(result.publish, 'Sun, 6 Dec · 9:00 AM');
});
test('schedule uses selected time zone, day, lead and time without an API', () => {
    const result = publishingPreview({ timezone: 'UTC', publish_day: '5', publish_time: '18:30', lead_hours: '48' }, new Date('2026-11-24T06:00:00Z'));
    assert.equal(result.draft, 'Wed, 25 Nov · 6:30 PM');
    assert.equal(result.publish, 'Fri, 27 Nov · 6:30 PM');
});
test('career trend settings reuse admin controls and preserve the secured editorial boundary', () => {
    const page = read('resources/js/pages/admin/CareerTrendSettings.tsx');
    for (const title of ['Schedule & approval', 'Topics & audience', 'Report template', 'AI integration', 'Sources & quality', 'Publishing preview']) assert.ok(page.includes(title));
    assert.match(page, /<AdminLayout/);
    assert.match(page, /<AdminChoice/);
    assert.match(page, /<AdminCreatableMultiChoice/);
    assert.match(page, /form\.put\('\/admin\/ai\/career-trends'/);
    assert.doesNotMatch(page, /localStorage|api_key\s*:/);
    const controller = read('app/Http/Controllers/Admin/AI/CareerTrendSettingsController.php');
    assert.match(controller, /ai\.manage_editorial/);
    assert.match(controller, /lockForUpdate/);
    assert.match(controller, /career_trends\.settings\.update/);
    assert.match(read('app/Http/Requests/Admin/UpdateCareerTrendSettingsRequest.php'), /ai\.manage_editorial/);
    assert.match(read('routes/web.php'), /Route::put\('\/career-trends'/);
    assert.match(read('resources/css/pm-career-trend-settings.css'), /var\(--pm-admin-settings-section-title\)/);
});


test('Career Trends leaves the shared admin shell unchanged', () => {
    const css = read('resources/css/pm-career-trend-settings.css');
    assert.doesNotMatch(css, /\.pm-admin-(sidebar|topbar|breadcrumb|content)\b/);
    assert.doesNotMatch(css, /\.pm-admin:has\(\.pm-career-settings\)\s*\{/);
    assert.doesNotMatch(read('resources/js/pages/admin/CareerTrendSettings.tsx'), /breadcrumb=\{/);
});
test('topics and target levels accept typed values and search master data', () => {
    const component = read('resources/js/components/admin/AdminCreatableMultiChoice.tsx');
    assert.match(component, /event.key === 'Enter'/);
    assert.match(component, /query.trim\(\)/);
    assert.match(component, /normalized\(option.label\).includes\(term\)/);
    const validation = read('app/Http/Requests/Admin/UpdateCareerTrendSettingsRequest.php');
    assert.match(validation, /'max:500'/);
    assert.match(validation, /'distinct:ignore_case'/);
    const controller = read('app/Http/Controllers/Admin/AI/CareerTrendSettingsController.php');
    assert.match(controller, /HomepageMasterData::options\(categories:/);
    assert.match(controller, /career_trend_topic/);
    assert.match(controller, /career_trend_target_level/);
});
test('provider is pinned for queued Trends requests, test is metered and never publishes', () => {
    const gateway = read('app/Domain/AI/Services/AiGateway.php');
    assert.match(gateway, /CareerTrendSettings::class\)->get\(\)\['ai_provider'\]/);
    assert.match(gateway, /'provider' => \$provider/);
    const execution = read('app/Domain/AI/Services/AiExecutionService.php');
    assert.match(execution, /\$request->feature_code === 'trend_draft' && \$request->provider === 'gemini'/);
    const connection = read('app/Domain/AI/Services/TrendAiConnection.php');
    assert.match(connection, /'subject_type' => 'trend_connection_test'/);
    assert.match(connection, /AiBudgetService::class\)->reserve/);
    assert.match(connection, /ExecuteAiRequest::dispatch/);
    assert.doesNotMatch(connection, /DB::table\('ai_editorial_drafts'\)/);
    assert.match(connection, /where\('subject_id', \$actorId\)/);
    const page = read('resources/js/pages/admin/CareerTrendSettings.tsx');
    assert.match(page, /while \(result.pending/);
    assert.match(page, /'Connected' : 'Disconnected'/);
    assert.match(read('routes/web.php'), /career-trends\/connection-test\/\{uuid\}/);
});
