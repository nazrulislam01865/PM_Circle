import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { filterBadges, nearestBadges, sampleActions, sampleSnapshot, simulate } from '../../resources/js/components/achievements/achievementState.ts';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const catalog = JSON.parse(read('config/achievement-badges.json'));
const blank = () => ({ badges: catalog.map(badge => ({ ...badge, available: false, value: 0, status: 'locked', earnedAt: null })), latest: [], records: [], paths: [], metrics: {}, recordLimit: 30 });
test('all 42 prototype milestones, unique ids, 21 artwork groups and tier requirements', () => {
    assert.equal(catalog.length, 42);
    assert.equal(new Set(catalog.map(b => b.id)).size, 42);
    assert.equal(new Set(catalog.map(b => b.metric)).size, 21);
    assert.equal(catalog.filter(b => b.newBadge).length, 3);
    for (const b of catalog) {
        assert.ok(b.target > 0 && b.tier >= 1 && b.tier <= 3);
        assert.ok(read('resources/js/components/achievements/artwork.ts').includes(`"${b.metric}"`));
        assert.ok(read('resources/css/pm-design-tokens.css').includes(`--achievement-${b.metric}-light:`));
    }
});
test('prototype sample totals, closest milestones and latest badge order', () => {
    const data = sampleSnapshot(blank());
    assert.equal(data.badges.filter(b => b.status === 'earned').length, 11);
    assert.equal(data.metrics.minutes, 150);
    assert.deepEqual(data.latest.map(b => b.id), ['courses-1', 'cert-1', 'exam-1']);
    assert.deepEqual(nearestBadges(data.badges).map(b => b.id), ['challenge-5', 'profile-100', 'sim-5']);
});
test('feature, status and search filters match the prototype, including locked/not-yet-earned', () => {
    const { badges } = sampleSnapshot(blank());
    assert.equal(filterBadges(badges, 'all', 'all', '').length, 42);
    assert.equal(filterBadges(badges, 'all', 'locked', '').length, 31);
    assert.equal(filterBadges(badges, 'all', 'new', '').length, 3);
    assert.equal(filterBadges(badges, 'Exam Simulator', 'earned', 'pmp').length, 1);
    assert.equal(filterBadges(badges, 'all', 'all', 'NO SUCH BADGE').length, 0);
});
test('sample actions unlock milestones, update paths and records without modifying real props', () => {
    const real = blank(); const original = structuredClone(real); const demo = sampleSnapshot(real);
    const updated = simulate(demo, sampleActions[0]);
    assert.equal(updated.metrics.challenges, 5);
    assert.equal(updated.badges.find(b => b.id === 'challenge-5').status, 'earned');
    assert.equal(demo.metrics.challenges, 4);
    assert.equal(updated.records.length, demo.records.length + 1);
    const course = simulate(updated, sampleActions[2]);
    assert.equal(course.metrics.certificates, 2); assert.equal(course.metrics.minutes, 210);
    const sim = simulate(course, sampleActions[4]); assert.equal(sim.paths[0].completedActivities, 4);
    assert.deepEqual(real, original);
    assert.doesNotMatch(read('resources/js/pages/account/Achievements.tsx'), /router\.post|fetch\(|localStorage|sessionStorage/);
});
test('shared card artwork, central styles, member-scoped read-only source and existing shell', () => {
    const page = read('resources/js/pages/account/Achievements.tsx');
    const css = read('resources/css/pm-achievements.css');
    const query = read('app/Domain/Achievements/Queries/MemberAchievements.php');
    assert.match(page, /<PublicLayout guideLayout>/); assert.match(page, /showModal\(\)/);
    assert.match(css, /repeat\(3,minmax\(0,1fr\)\)/); assert.match(css, /repeat\(5,minmax\(0,1fr\)\)/);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
    assert.match(query, /\$user->getKey\(\)/); assert.match(query, /orWhere\('c.check_status', 'approved'\)/);
    assert.match(query, /groupBy\('s.id', 's.title'\)/); assert.match(query, /COUNT\(\*\) OVER \(PARTITION BY metric\)/);
    assert.doesNotMatch(query, /->(?:insert|update|delete|upsert)\(/);
    assert.match(read('resources/js/components/dashboard/MemberHomeOverview.tsx'), /<BadgeMedal badge=\{badge\}/);
    assert.match(read('resources/js/pages/settings/profile.tsx'), /<LatestBadgeCards badges=/);
});
