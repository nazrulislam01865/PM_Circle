import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { paginationWindow } from '../../resources/js/lib/pagination-window.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const js = path => read('resources/js/' + path);
const mobile = read('resources/css/pm-mobile-layout.css');
test('bounded pagination always includes current, first and last with no invalid or duplicate page numbers', () => {
    for (let last = 2; last <= 100; last++) for (let current = 1; current <= last; current++) {
        const pages = paginationWindow(current,last);
        assert.ok(pages.length <= 5);
        assert.ok(pages.includes(1) && pages.includes(current) && pages.includes(last));
        const numbers = pages.filter(value => typeof value === 'number');
        assert.equal(new Set(numbers).size,numbers.length);
        assert.ok(numbers.every(value => value >= 1 && value <= last));
    }
});
test('client and server listing pagination share the same control with correct current and disabled states', () => {
    const shared = js('components/pm/Pagination.tsx');
    assert.match(shared,/aria-current=\{active \? 'page'/);
    assert.match(shared,/disabled=\{!onClick\}/);
    assert.match(shared,/href=\{link.url\}/);
    for (const page of ['pages/events/Index.tsx','pages/learning/Catalog.tsx','components/learning/PublicCourseCatalog.tsx','pages/scenarios/Index.tsx','pages/members/Directory.tsx','pages/career/Jobs.tsx','pages/community/SavedPosts.tsx','pages/admin/LearningCourses.tsx','pages/admin/LearningCourseContent.tsx','pages/admin/PmpQuestionBank.tsx','pages/admin/PostModeration.tsx','pages/admin/InterviewCatalog.tsx']) {
        assert.match(js(page), /<(?:(?:Adjacent|Linked)?Pagination)\b/,page);
    }
});
test('real public and member posts share one reaction count and persist the breakdown in the feed state', () => {
    assert.match(js('components/community/PostCardV2.tsx'),/<PostEngagementActions/);
    assert.doesNotMatch(js('components/community/PostCardV2.tsx'),/buttonLabel=|prototypeIcon/);
    assert.match(js('components/community/PostEngagementActions.tsx'),/showCount=\{false\}/);
    assert.match(js('components/community/PostEngagementActions.tsx'),/onReactionChange\?\.\(reaction, count, next, responseVersion\)/);
    assert.match(js('components/dashboard/DashboardFeed.tsx'),/reactionBreakdown: counts/);
    assert.match(js('pages/community/Feed.tsx'),/reaction_breakdown: counts/);
    assert.match(mobile,/\.pm-post-reaction-stack \{ display: inline-flex/);
    assert.doesNotMatch(mobile,/\.pm-post-reaction-stack \{ display: none/);
    assert.match(js('components/community/PostReactions.tsx'),/\/reactions\/users\?/);
});
test('scenario mobile menu keeps the original share and save handlers, without a fake post roster', () => {
    const page = js('pages/scenarios/Show.tsx');
    assert.match(page,/<EngagementOverflowMenu/);
    assert.match(page,/onSelect: toggleBookmark/);
    assert.match(page,/scenarioShare\.share\(\)/);
    assert.match(page,/pm-scenario-engagement-row/);
    assert.doesNotMatch(page,/PostReactionSummary/);
    assert.match(js('components/home/v2/HomeCommunity.tsx'),/<EngagementOverflowMenu/);
});
test('home and event catalog share mobile date/content/action grid and signup banner stacks', () => {
    for (const file of ['components/home/v2/HomeEvents.tsx','components/events/EventComponents.tsx']) {
        assert.match(js(file),/pm-event-row-layout/);
        assert.match(js(file),/pm-event-row-action/);
    }
    assert.match(mobile,/\.pm-event-row-layout \.pm-event-row-action \{ grid-column: 2; grid-row: 2/);
    assert.match(read('resources/css/pm-home-v2-responsive.css'),/\.pm-home-v2 \.pm-v2-join-banner \{ flex-direction: column/);
});
