import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('community hides non-functional sort for guests and members, with accessible search and feed tabs', () => {
    const feed = read('resources/js/pages/community/Feed.tsx');
    assert.doesNotMatch(feed, /className="pm-sort-dropdown"/);
    assert.match(feed, /type="search"/);
    assert.match(feed, /aria-label="Search discussions"/);
    assert.match(feed, /placeholder="Search discussions or topics\.\.\."/);
    assert.match(feed, /<FeedScopeTabs /);
});

test('member homepage profile link opens the private My profile page', () => {
    const overview = read('resources/js/components/dashboard/MemberHomeOverview.tsx');
    assert.match(overview, /<Link href="\/settings\/profile"><Eye[^>]*\/>View profile<\/Link>/);
    assert.doesNotMatch(overview, /View public profile/);
});

test('daily scenarios are scheduled, preserving previous drafts and scheduled publishing', () => {
    const executor = read('app/Domain/AI/Services/AiExecutionService.php');
    const publisher = read('routes/console.php');
    const admin = read('resources/js/pages/admin/DailyChallenge.tsx');
    assert.match(executor, /\$status = 'scheduled';/);
    assert.match(publisher, /whereIn\('status', \['scheduled', 'pending_review', 'approved'\]\)/);
    assert.match(admin, /Scheduled \(automatic\)/);
});
