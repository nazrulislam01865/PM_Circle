import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const get = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
const route = get('routes/web.php');
const dashboard = get('resources/js/pages/admin/Dashboard.tsx');
const overview = get('app/Domain/Dashboard/Queries/AdminDashboardOverview.php');
const styles = get('resources/css/pm-admin-overview.css');
const appStyle = get('resources/css/app.css');

// Regression safeguards for the new admin-only dashboard without extra test dependencies.
test('dashboard is inside existing authenticated admin route group', () => {
    assert.match(route, /middleware\(\['auth', 'pm\.admin', 'verified'\]\)/);
    assert.match(route, /Route::get\('\/', AdminDashboardController::class\)->name\('dashboard'\)/);
});
test('UI metric values are rendered from props, not screenshot example values', () => {
    assert.match(dashboard, /metric=\{stats\[item\.key\]\}/);
    for (const invented of ['12,840', '8,921', '3,756', '28,587']) assert.ok(!dashboard.includes(invented));
});
test('reports support bounded and validated day windows', () => {
    assert.match(get('app/Http/Controllers/Admin/DashboardController.php'), /\['7', '30', '90'/);
    assert.match(overview, /Cache::remember\(/);
    assert.match(overview, /private function periodCounts\(/);
});
test('operational statuses are not invented', () => {
    assert.match(overview, /'status' => 'Not monitored'/);
    assert.match(overview, /'recentImports' => null/);
    assert.ok(!overview.includes("'Healthy'"));
});
test('dashboard composes real working navigation routes and date filters', () => {
    assert.match(dashboard, /router\.get\('\/admin', \{ days: value \}/);
    for (const path of ['/admin/post-reports', '/admin/profile-rewards', '/admin/homepage', '/admin/learning/courses/create', '/admin/interview-preparation']) {
        assert.ok(dashboard.includes(path), path);
    }
});
test('uses centralized Rajdhani tokens with responsive columns', () => {
    assert.match(appStyle, /pm-admin-overview\.css/);
    assert.match(styles, /var\(--font-ui\)/);
    assert.match(styles, /@media\(max-width:45rem\)/);
    assert.doesNotMatch(styles, /font-family:\s*["']?(Arial|Montserrat|Inter)/i);
});
