import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { memberSidebarGroups, memberSidebarActive, memberSidebarContains } from '../../resources/js/components/dashboard/memberSidebarNavigation.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('course navigation groups all three destinations without imposing exam entitlements', () => {
    const [courses, exams, challenge] = memberSidebarGroups[0].items;
    assert.deepEqual([courses.label, exams.label, challenge.label], ['Courses', 'Exam Simulator', 'Daily challenge']);
    assert.deepEqual(courses.children.map(c => c.id), ['learning', 'courses', 'certificates']);
    assert.ok(!courses.premium && courses.children.every(c => !c.premium));
    for (const child of courses.children) assert.ok(memberSidebarContains(courses, memberSidebarActive(child.href)));
    for (const path of ['/dashboard/learning/courses/demo/lessons/2', '/learning/courses/demo/lessons/1']) assert.equal(memberSidebarActive(path), 'learning');
    assert.equal(memberSidebarActive('/learning/courses/demo'), 'courses');
    assert.equal(memberSidebarActive('/dashboard/learning/certificates/1'), 'certificates');
    assert.equal(memberSidebarActive('/simulators/project'), undefined);
    assert.equal(exams.premium, true);
});
test('AI badges and independent accessible submenus reuse central styles', () => {
    const sidebar = read('resources/js/components/dashboard/DashboardSidebar.tsx');
    const css = read('resources/css/pm-member-sidebar-restore.css');
    assert.match(sidebar, /<span className="pm-member-parent-label">\{entry.label\}<\/span><AiBadge\/>/);
    assert.match(sidebar, /aria-controls=\{submenuId\}/);
    assert.match(sidebar, /\[entry.id\]: !expanded/);
    assert.match(css, /\.is-collapsed .*\.pm-member-ai-badge \{ display: none/);
    assert.match(css, /font: var\(--semibold\) var\(--text-xs\)\/var\(--line-ui\) var\(--font-ui\)/);
    assert.doesNotMatch(read('resources/js/components/home/v2/HomeHeader.tsx'), /AI learning tools/);
    assert.doesNotMatch(read('resources/js/components/dashboard/MemberHomeHeader.tsx'), /href="\/simulators\/project"/);
});
test('comment moderation messages share inset feedback with accessible status and errors', () => {
    const composer = read('resources/js/components/community/CommentComposer.tsx');
    const feedback = read('resources/js/components/community/CommentFeedback.tsx');
    const css = read('resources/css/pm-post-checker.css');
    assert.match(composer, /failedComment \? 'warning' : pendingReview \? 'checking' : 'info'/);
    assert.match(composer, /<CommentFeedback tone="error" message=\{error\}/);
    assert.match(composer, /Retry check/);
    assert.match(feedback, /role=\{tone === 'error' \? 'alert' : 'status'\}/);
    assert.match(css, /\.pm-comment-feedback-stack \{[^}]*margin: 0 var\(--s3\) var\(--s3\)/);
    assert.match(css, /\.pm-comment-feedback \{[^}]*padding: var\(--s3\)/);
    assert.match(css, /overflow-wrap: anywhere/);
    assert.match(css, /prefers-reduced-motion: reduce/);
    assert.match(read('resources/js/components/community/InlinePostComments.tsx'), /<CommentFeedback tone="error"/);
});


test('AI labels sit beside parent text and nested children use an inset guide', () => {
    const css = read('resources/css/pm-member-sidebar-restore.css');
    assert.match(css, /\.pm-member-parent-label \{[^}]*flex: 0 1 auto/);
    assert.match(css, /\.pm-member-exam-chevron \{[^}]*margin-inline-start: auto/);
    assert.match(css, /\.pm-member-exam-submenu \{[^}]*padding-inline-start: var\(--s2\)/);
});

test('new comments never enter manual review; uncertain results are hidden without a strike', () => {
    const job = read('app/Domain/AI/Jobs/CheckCommunityComment.php');
    assert.doesNotMatch(job, /pending_review|holdCleanContent/);
    assert.match(job, /if \(\$result\['violates'\]\) \{[\s\S]*?recordCommentViolation/);
    const uncertain = job.split("elseif ($result['needs_review']) {")[1].split('} else {')[0];
    assert.match(uncertain, /check_status = 'restricted'/);
    assert.doesNotMatch(uncertain, /recordCommentViolation|EngagementStats/);
    assert.match(job, /check_status = 'approved'/);
    assert.match(read('app/Models/Comment.php'), /orWhere\('check_status', 'approved'\)/);
    assert.doesNotMatch(read('resources/js/components/community/CommentComposer.tsx'), /awaiting an administrator review/);
});
