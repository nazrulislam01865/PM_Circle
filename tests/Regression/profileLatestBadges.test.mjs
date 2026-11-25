import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('profile overview places a single compact latest badge card between completeness and reward', () => {
    const profile = read('resources/js/pages/settings/profile.tsx');
    const sidebar = profile.slice(profile.indexOf('<aside className="pm-profile-side-col">'));
    assert.equal((profile.match(/<LatestBadgeCards\b/g) ?? []).length, 1);
    const card = '<LatestBadgeCards badges={profileData.latest_badges ?? []} variant="profile-rail"/>';
    assert.ok(sidebar.indexOf(card) > sidebar.indexOf('profile-completeness-title'));
    assert.ok(sidebar.indexOf(card) < sidebar.indexOf('<ProfileCompletionReward'));
    assert.match(read('app/Http/Controllers/Settings/ProfileController.php'), /'latest_badges' => \$stats\['overview'\]\['badges'\] \?\? \[\]/);
});

test('compact variant reuses earned medal and actual date, caps display at three and links to achievements', () => {
    const component = read('resources/js/components/achievements/AchievementCards.tsx');
    const compact = component.slice(component.indexOf("if (variant === 'profile-rail')"), component.indexOf('return <AchievementPanel title="Latest badges"'));
    assert.match(compact, /filter\(badge => badge.status === 'earned'\)\.slice\(0, 3\)/);
    assert.match(compact, /<BadgeMedal badge=\{badge\}/);
    assert.match(compact, /badge.earnedAt && <time dateTime=\{badge.earnedAt\}>\{achievementDate\(badge.earnedAt\)\}/);
    assert.match(compact, /No activity badges earned yet/);
    assert.match(compact, /href=\{achievementHref\}.*View all achievements/);
    assert.doesNotMatch(compact, /fetch\(|router\.|localStorage/);
});

test('profile card uses three equal columns and centralized surface and text roles', () => {
    const css = read('resources/css/pm-profile-ux.css').split('/* Compact latest-earned badges:')[1];
    assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(css, /var\(--pm-guide-card-padding\)/);
    assert.match(css, /var\(--text-ui\)\/var\(--line-ui\) var\(--font-ui\)/);
    assert.match(css, /var\(--text-sm\)\/var\(--line-sm\) var\(--font-ui\)/);
    assert.doesNotMatch(css, /#[\da-f]{3,8}\b|font-size:\s*\d/i);
});
