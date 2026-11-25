import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { retryAfterSeconds } from '../../resources/js/components/admin/ai/diagnostic-retry.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('diagnostic cooldown honors seconds and HTTP-date Retry-After values', () => {
    const now = Date.parse('2026-11-25T06:00:00Z');
    assert.equal(retryAfterSeconds('25', now), 25);
    assert.equal(retryAfterSeconds('Wed, 25 Nov 2026 06:00:15 GMT', now), 15);
    assert.equal(retryAfterSeconds('0', now), 1);
    assert.equal(retryAfterSeconds(null, now), 60);
    assert.equal(retryAfterSeconds('invalid', now), 60);
});

test('AI diagnostics are scoped by admin, route and feature, with polling isolated', () => {
    const provider = read('app/Providers/AppServiceProvider.php');
    assert.match(provider, /RateLimiter::for\('admin-ai-diagnostic'/);
    assert.match(provider, /\$request->route\(\)->getName\(\)\s*\.\s*':'\s*\.\s*\$request->route\('feature', ''\)/);
    assert.match(provider, /Limit::perMinute\(5\)->by\(\$actor\.':'\.\$scope\)/);
    assert.match(provider, /RateLimiter::for\('admin-ai-diagnostic-status'/);
    const routes = read('routes/web.php');
    for (const name of ['career-trends.connection-test', 'feed-moderation.test', 'feature-connection']) {
        assert.ok(routes.includes(`->withoutMiddleware('throttle:60,1')->middleware('throttle:admin-ai-diagnostic')->name('${name}')`));
    }
    assert.match(routes, /withoutMiddleware\('throttle:60,1'\)->middleware\('throttle:admin-ai-diagnostic-status'\)->name\('career-trends.connection-test.status'\)/);
    assert.match(routes, /\['auth', 'pm.admin', 'verified', 'throttle:60,1'\]/);
});

test('all diagnostic controls prevent duplicate submissions and handle throttling without clearing results', () => {
    const hook = read('resources/js/components/admin/ai/useDiagnosticTest.ts');
    assert.match(hook, /running.current \|\| retryUntil.current > Date.now\(\)/);
    assert.match(hook, /response.headers.get\('Retry-After'\)/);
    assert.match(hook, /clearInterval\(interval\)/);
    for (const page of ['resources/js/components/admin/ai/SettingsShared.tsx', 'resources/js/pages/admin/CareerTrendSettings.tsx', 'resources/js/pages/admin/FeedModerationAiSettings.tsx']) {
        const source = read(page);
        assert.match(source, /if \(!begin\(\)\) return/);
        assert.match(source, /rateLimited\(response\)/);
        assert.match(source, /retrySeconds/);
        assert.doesNotMatch(source, /Too many tests. Try again shortly./);
    }
    const career = read('resources/js/pages/admin/CareerTrendSettings.tsx');
    assert.match(career, /rateLimited\(poll\)/);
    assert.doesNotMatch(career, /code: 'TEST_FAILED'/);
});

test('all five AI menu links share a collapsible navigation group without changing existing routes', () => {
    const layout = read('resources/js/layouts/admin/AdminLayout.tsx');
    const group = layout.slice(layout.indexOf('const aiSettingsLinks'), layout.indexOf('export function AdminLayout'));
    for (const path of ['career-trends', 'daily-challenge', 'pmp-settings', 'feed-moderation', 'usage-management']) {
        assert.ok(group.includes(`/admin/ai/${path}`));
        assert.doesNotMatch(layout, new RegExp(`<Link href="/admin/ai/${path}"`));
    }
    assert.match(layout, /aria-expanded=\{aiOpen\}/);
    assert.match(layout, /if \(isAi\) setAiOpen\(true\)/);
    assert.match(layout, /aiSettingsLinks.map/);
    assert.match(layout, /const isPmpBank = active === '\/admin\/exam-simulator\/pmp\/questions';/);
    assert.match(layout, /\.\.\.aiSettingsLinks/);
});
