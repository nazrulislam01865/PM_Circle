import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('membership switching retains a dedicated ten-per-minute member throttle', () => {
    const routes = read('routes/web.php');
    const providers = read('app/Providers/AppServiceProvider.php');
    assert.match(routes, /Route::post\('\/membership\/temporary', \[TemporaryMembershipController::class, 'update'\]\)->middleware\('throttle:membership-switch'\)/);
    assert.match(providers, /RateLimiter::for\('membership-switch',[\s\S]*?getAuthIdentifier\(\)[\s\S]*?Limit::perMinute\(10\)->by\('membership-switch:'\.\$member\)/);
    assert.match(routes, /PaymentCheckoutController::class, 'membership'\]\)\s*->middleware\('throttle:6,1'\)/);
});

test('rate-limited membership Inertia posts redirect to their inline plan error, not a raw HTML modal', () => {
    const bootstrap = read('bootstrap/app.php');
    assert.match(bootstrap, /getStatusCode\(\) !== 429/);
    assert.match(bootstrap, /hasHeader\('X-Inertia'\)/);
    assert.match(bootstrap, /\$request->expectsJson\(\)/);
    assert.match(bootstrap, /\$request->is\('membership\/temporary'\)[\s\S]*?route\('membership.index', \[\], 303\)[\s\S]*?withErrors\(\['plan' => "Too many membership switch requests\. Try again in \{\$retryAfter\} seconds\."\]\)/);
    assert.match(bootstrap, /admin\/ai\/daily-challenge\/generate/);
});

test('membership switch blocks duplicate clicks synchronously and shows the shared error alert', () => {
    const page = read('resources/js/pages/billing/Membership.tsx');
    const comparison = read('resources/js/components/billing/PricingComparisonContent.tsx');
    assert.match(page, /const submitting = useRef\(false\)/);
    assert.match(page, /if \(!temporaryAccessEnabled \|\| submitting.current \|\| processing !== null \|\| plan === currentPlan \|\| \(plan !== 'free' && !months\)\) return;\s*submitting.current = true;/);
    assert.match(page, /onFinish: \(\) => \{\s*submitting.current = false;/);
    assert.match(page, /onError: errors => setError\(errors.plan/);
    assert.match(page, /preserveScroll: page => !page.props.errors\?\.plan/);
    assert.match(comparison, /error && <p role="alert"/);
});
