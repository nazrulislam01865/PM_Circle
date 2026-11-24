import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const member = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
const sidebar = read('resources/js/components/dashboard/DashboardSidebar.tsx');
const compactHeader = read('resources/js/components/dashboard/MemberCompactHeader.tsx');
const shared = read('resources/js/layouts/pm/PublicLayout.tsx');
const middleware = read('app/Http/Middleware/HandleInertiaRequests.php');
const css = read('resources/css/pm-member-sidebar-restore.css');

test('one common sidebar and simplified member header render across member routes', () => {
    assert.match(member, /<DashboardSidebar dashboard=\{dashboard\}/);
    assert.match(member, /<MemberCompactHeader dashboard=\{dashboard\}/);
    assert.doesNotMatch(member, /<MemberSecondaryNavigation/);
    assert.doesNotMatch(compactHeader, />My profile<\/Link>/, 'Profile text must not appear in the member header');
    assert.match(read('resources/js/components/dashboard/DashboardHeader.tsx'), /<UserRound size=\{17\}\/> My profile<\/Link>/,
        'The account icon dropdown must retain the My profile link');
    assert.match(compactHeader, /<DashboardHeader name=\{dashboard.member.name\}/);
    assert.match(compactHeader, /onOpenNavigation/);
    assert.match(shared, /auth\?\.user && !auth.user.is_admin && memberShell/);
    assert.match(middleware, /'memberShell' => fn \(\) => \$request->user\(\)/);
});

test('sidebar uses the exact prototype groups and opens learning plus the active group', () => {
    assert.match(sidebar, /memberSidebarGroups\.map/);
    assert.match(sidebar, /<details className="pm-member-sidebar-group"/);
    assert.match(sidebar, /group\.title === 'Learn & practise' \|\| group\.title === activeGroup/);
    assert.match(sidebar, /open=\{compact \|\| expandedGroups\[group\.title\]\}/);
    assert.match(sidebar, /onClick=\{event => toggleGroup\(event, group\.title\)\}/);
    assert.match(sidebar, /id="pm-member-sidebar"/);
    assert.match(css, /@media \(max-width: 960px\)/);
    assert.match(css, /\.pm-member-sidebar-layout \.pm-dash-scrim/);
    assert.match(css, /\.pm-member-content-frame > \.pm-member-restored-sidebar\.is-open/);
});

test('cached offer label and modal are shared on every guest and member page', () => {
    assert.match(middleware, /'rewardPromotion'/);
    assert.match(shared, /homeOfferLabel \?\? rewardPromotion\?\.discountLabel/);
    assert.match(shared, /\{discountLabel && <HomeOfferBar/);
    assert.match(member, /\{discountLabel && <HomeOfferBar/);
    assert.match(member, /<RewardOfferProvider discountLabel=\{discountLabel\} isMember>/);
    assert.match(read('resources/js/layouts/pm/AuthPageFrame.tsx'), /\{label && <HomeOfferBar/);
    assert.match(read('resources/js/components/pm/SiteHeader.tsx'), /<MemberCompactHeader dashboard=\{memberShell\}/);
});
