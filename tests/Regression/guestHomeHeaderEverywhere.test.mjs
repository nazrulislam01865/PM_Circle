import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = name => readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');

const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
const auth = read('resources/js/layouts/pm/AuthPageFrame.tsx');
const discover = read('resources/js/components/discover-pm/DiscoverShell.tsx');
const header = read('resources/js/components/home/v2/HomeHeader.tsx');
const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
const siteFooter = read('resources/js/components/pm/SiteFooter.tsx');
const course = read('resources/js/pages/learning/CourseShow.tsx');
const courseStyles = read('resources/css/pm-learning-course-detail.css');

test('every logged-out PublicLayout uses the exact homepage navigation and its styling shell', () => {
    assert.match(layout, /const isGuest = !auth\?\.user;/);
    assert.match(layout, /const showHomeHeader = homePrototype \|\| isGuest;/);
    assert.match(layout, /showHomeHeader \? <HomeHeader eventsVisible=\{homeEventsVisible\}\/> : <SiteHeader/);
    assert.match(layout, /showHomeHeader \? ' pm-home-v2-shell'/);
    assert.match(layout, /isGuest \? ' pm-guest-public-shell'/);
    assert.doesNotMatch(layout, /fetch\(|axios\.|router\.get\(/);
});

test('guest authentication and discover journeys use the identical HomeHeader', () => {
    for (const source of [auth, discover]) {
        assert.match(source, /const isGuest = !(?:usePage|auth\?\.user)/);
        assert.match(source, /isGuest \? <HomeHeader\s*\/> : <SiteHeader/);
        assert.match(source, /isGuest \? ' pm-home-v2-shell'/);
        assert.match(source, /<SiteFooter\s*\/>/);
    }
});

test('logged-in public pages use the shared sidebar shell and exams keep the focused exam screen', () => {
    assert.match(layout, /auth\?\.user && !auth\.user\.is_admin && memberShell/);
    assert.match(layout, /<MemberDashboardLayout dashboard=\{memberShell\}/);
    assert.match(read('resources/js/pages/exam/Take.tsx'), /<SiteHeader active="\/exams\/pmp" authenticatedMemberNavigation\s*\/>/);
    assert.match(read('resources/js/layouts/pm/MemberDashboardLayout.tsx'), /<MemberCompactHeader dashboard=\{dashboard\}/);
    assert.match(read('resources/js/layouts/pm/MemberDashboardLayout.tsx'), /<DashboardSidebar dashboard=\{dashboard\}/);
});

test('homepage dropdown menu and links are the original shared source', () => {
    for (const label of ['Browse simulators', 'Compare Plans', 'Browse courses',
        'Community feed', 'Daily Challenge', 'Community events', 'Trends', 'Events']) {
        assert.ok(header.includes(label), `${label} missing`);
    }
    assert.match(header, /href: '\/events', label: 'Community events'/);
    assert.match(header, /href: '\/simulators', label: 'Browse simulators'/);
    assert.match(header, /href: '\/learning', label: 'Browse courses'/);
});

test('all site footers use the approved homepage component, without legacy wording', () => {
    assert.match(siteFooter, /return <HomeFooter content=\{content\}/);
    assert.doesNotMatch(siteFooter, /<PmpPublicFooter/);
    for (const text of ['Company', 'Learning', 'Community', 'Plans & Policies',
        'Learn project management, practise for certification, and connect with peers.', 'Trademark notice.']) {
        assert.ok(footer.includes(text), `${text} missing in reference footer`);
    }
    assert.doesNotMatch(footer, /Homepage design mockup|Sample content/);
});

test('guest course detail aligns to the approved public rail without changing course logic', () => {
    assert.match(courseStyles, /\.pm-guest-public-shell \.pm-course-detail-inner \{ width: var\(--pm-v2-container-width\); \}/);
    assert.match(course, /<PublicLayout siteLayout=\{!memberView\}/);
    assert.match(course, /<CourseDetailCurriculum course=\{course\} canRead=\{canRead\}/);
    assert.match(course, /<CourseAccessCard course=\{course\}/);
    assert.match(course, /router\.post\(`\$\{url\}\/enroll`/);
});
