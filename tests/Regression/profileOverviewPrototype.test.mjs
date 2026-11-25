import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
const page = read('resources/js/pages/settings/profile.tsx');
const css = read('resources/css/pm-profile-ux.css');
const reward = read('resources/js/components/rewards/ProfileCompletionReward.tsx');
const rewardCss = read('resources/css/pm-profile-reward.css');
test('own overview uses supplied wide cover while retaining custom image and avatar editing',()=>{
    assert.match(page,/pm-hero-card pm-profile-overview-hero/);
    assert.match(page,/profileData\.cover_photo_path\}\), url\(\/images\/pm-profile-overview-cover.webp\)/);
    assert.match(page,/<ProfileHeroPhoto name=\{profileData.name\} src=\{profileData.avatar_path\}/);
    assert.match(page,/aria-label="Update profile picture"/);
    assert.match(css,/aspect-ratio: var\(--pm-guide-profile-cover-ratio\)/);
    assert.ok(existsSync(new URL('../../public/images/pm-profile-overview-cover.webp',import.meta.url)));
});
test('completeness uses server percentage, accessible horizontal progress and existing entitlement',()=>{
    assert.match(page,/aria-valuenow=\{profileData.completeness\}/);
    assert.match(page,/Math.min\(100, Math.max\(0, profileData.completeness\)\)/);
    assert.match(page,/changeTab\(canUseAssistant \? 'assistant' : 'edit'\)/);
    assert.match(page,/profileData.completeness < 100/);
    assert.match(page,/Your profile is complete\./);
});
test('profile reward retains real state, dynamic discount and existing copy behavior',()=>{
    assert.match(reward,/reward.status === 'pending' && <span className="pm-profile-reward-locked">Locked/);
    assert.match(reward,/Get \$\{reward.discountLabel\} an eligible Exam Simulator/);
    assert.match(reward,/navigator.clipboard.writeText\(reward.code\)/);
    assert.match(reward,/variant === 'dashboard' && reward.status === 'pending' && <Link/);
    assert.match(rewardCss,/background: var\(--pm-guide-amber-bg\)/);
});
test('overview typography uses centralized semantic roles and scoped selectors',()=>{
    const own = css.slice(css.indexOf('/* Own-profile Overview only'));
    assert.match(own,/var\(--pm-guide-weight-h2\) var\(--pm-guide-profile-identity-title\)\/var\(--line-h2\) var\(--font-ui\)/);
    assert.match(own,/var\(--bold\) var\(--text-h3\)\/var\(--line-h3\) var\(--font-ui\)/);
    assert.match(own,/var\(--bold\) var\(--text-stat\)\/var\(--line-stat\) var\(--font-ui\)/);
    assert.match(own,/@container \(max-width: 28rem\)/);
    assert.doesNotMatch(own,/font-size:\s*\d|#[\da-f]{3,8}\b/i);
    assert.match(page,/pm-profile-page--overview/);
});

test('cover upload reuses authenticated profile endpoint and banner crop proportions',()=>{
    const crop = read('resources/js/components/profile/ProfileImageCropDialog.tsx');
    const tokens = read('resources/css/pm-design-tokens.css');
    const controller = read('app/Http/Controllers/Settings/ProfileController.php');
    assert.match(page,/onClick=\{\(\) => coverInputRef.current\?\.click\(\)\}/);
    assert.match(page,/ProfileController.uploadCover.url\(\)/);
    assert.match(page,/disabled=\{photoSaving\}/);
    assert.match(crop,/cover: \{ width: 1590, height: 300/);
    assert.match(tokens,/--pm-guide-profile-cover-ratio: 1590 \/ 300/);
    assert.match(css,/\.pm-image-crop-cover \{ aspect-ratio: var\(--pm-guide-profile-cover-ratio\)/);
    assert.match(controller,/dimensions:max_width=6000,max_height=6000/);
    assert.match(controller,/\$details\['cover_photo_url'\] = ''/);
    assert.match(controller,/ValidationException::withMessages\(\['cover_photo'/);
});

 test('owner overview hero omits availability badge without changing saved preference',()=>{
    const hero = page.slice(page.indexOf('{/* Hero Card */}'),page.indexOf('{/* Every editable profile section'));
    assert.ok(hero.includes('pm-hero-name'));
    assert.match(hero,/overviewLocation &&/);
    assert.doesNotMatch(hero,/open_to_opportunities|pm-status-pill|status_label|Briefcase/);
    assert.match(page,/open_to_opportunities: profileData\?\.open_to_opportunities \?\? true/);
    assert.match(hero,/coverInputRef.current\?\.click\(\)/);
 });
