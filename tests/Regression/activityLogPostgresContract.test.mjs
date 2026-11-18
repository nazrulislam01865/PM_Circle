import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const feed = read('app/Domain/Activity/Queries/MemberActivityFeed.php');
const overview = read('resources/js/components/dashboard/MemberHomeOverview.tsx');
const controller = read('app/Http/Controllers/Account/ActivityLogController.php');
const routes = read('routes/web.php');

test('all activity UNION sources provide compatible numeric score columns on PostgreSQL', () => {
    // PostgreSQL resolves untyped NULLs to TEXT in nested UNIONs. A late exam
    // branch with SMALLINT correct_count / total_questions must not conflict.
    assert.equal((feed.match(/CAST\(NULL AS INTEGER\) AS correct_count, CAST\(NULL AS INTEGER\) AS total_questions/g) ?? []).length, 6);
    assert.match(feed, /CAST\(correct_count AS INTEGER\) AS correct_count, CAST\(total_questions AS INTEGER\) AS total_questions/);
    assert.match(feed, /CAST\(mode AS TEXT\) AS detail/);
    assert.doesNotMatch(feed, /(?<!\))NULL AS correct_count, NULL AS total_questions/);
});

test('community contribution View activity goes directly to the member activity log', () => {
    assert.match(overview, /<Link href="\/activity-log" className="pm-member-overview-link">View activity/);
    assert.doesNotMatch(overview, /<Link href="\/dashboard\/features\/insights" className="pm-member-overview-link">View activity/);
});

test('the activity log route is authenticated and feed uses the server-side member ID', () => {
    assert.match(routes, /Route::get\('\/activity-log', \[\\App\\Http\\Controllers\\Account\\ActivityLogController::class, 'index'\]\)/);
    assert.match(controller, /\$feed->page\(\(int\) \$request->user\(\)->id/);
    assert.match(feed, /->where\('user_id', \$userId\)/);
});
