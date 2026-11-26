import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { shouldShowSiteFooter } from '../../resources/js/components/pm/siteFooterVisibility.ts';
const read = filename => readFileSync(new URL(`../../${filename}`, import.meta.url), 'utf8');
const defaults = JSON.parse(execFileSync('php', ['-r', `echo json_encode(require ${JSON.stringify(new URL('../../config/homepage-v2.php', import.meta.url).pathname)});`], {encoding:'utf8'}));
const sections = read('resources/js/components/admin/homepage-sections.ts');
const editor = read('resources/js/pages/admin/Homepage.tsx');
const fields = read('resources/js/components/admin/HomepageFields.tsx');
const controller = read('app/Http/Controllers/Admin/HomepageController.php');
const request = read('app/Http/Requests/Admin/UpdateHomepageRequest.php');
const publicHome = read('resources/js/pages/public/Home.tsx');
const homeController = read('app/Http/Controllers/PublicSite/HomeController.php');
const expected = ['hero','quick_links','certification','courses','community_intro','community','scenario','members','skills','ai_features','resume','trends','events','join'];

test('admin section registry and canonical defaults match all current homepage sections in order', () => {
    assert.deepEqual(Object.keys(defaults), expected);
    assert.deepEqual([...sections.matchAll(/key: '([^']+)'/g)].map(x=>x[1]), expected);
    assert.match(editor, /defaults\[selected\]/);
    for (const key of expected.filter(k=>k!=='community_intro')) assert.ok(publicHome.includes(`visible('${key}')`),key);
    assert.match(read('resources/js/components/home/v2/HomeCommunity.tsx'), /content.community_intro.enabled/);
    for (const key of ['career_features','careers','pathway']) assert.ok(!Object.hasOwn(defaults,key));
});

test('editor supports list reordering, real image previews and independently saving one section', () => {
    assert.match(editor, /section:selected,content:draft/);
    assert.match(editor, /<RepeatableItems/);
    assert.match(fields, /fallbackImage/);
    assert.match(fields, /Move item/);
    assert.match(controller, /lockForUpdate\(\)/);
    assert.match(controller, /\$content\['homepage_v2'\]\[\$validated\['section'\]\] = \$section/);
    assert.match(controller, /revision !== \(int\) \$validated\['version'\]/);
});

test('all current hero, exam, AI and resume cards have real editable defaults', () => {
    assert.equal(defaults.hero.slides.length,3);
    assert.equal(defaults.certification.items.length,5);
    assert.equal(defaults.ai_features.cards.length,8);
    assert.equal(defaults.resume.steps.length,4);
    for (const [file,pattern] of [['HomeHero',/hero.slides/],['HomeLearning',/content.items.map/],['HomeAiResume',/content.cards.map/]]) {
        assert.match(read(`resources/js/components/home/v2/${file}.tsx`),pattern);
    }
});

test('public homepage uses the single existing shared footer and editor', () => {
    assert.equal(shouldShowSiteFooter('/'),true);
    assert.equal(shouldShowSiteFooter('/home'),true);
    assert.equal(shouldShowSiteFooter('/dashboard'),false);
    assert.equal(shouldShowSiteFooter('/exams/pmp/attempts/5'),false);
    assert.ok(!Object.hasOwn(defaults,'footer'));
    assert.match(editor,/href="\/admin\/footer"/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<SiteFooter/);
});

test('strict server validation and bounded live-data queries follow independently enabled sections', () => {
    assert.match(request,/HomepageMasterData::isAllowedNewValue/);
    assert.match(request,/array:.*array_keys\(\$shape\)/);
    assert.match(request,/Rule::in\(array_keys\(\$sections\)\)/);
    assert.match(request,/public function authorize/);
    for (const key of ['courses','community','scenario','members','events']) assert.ok(homeController.includes(`$visible('${key}')`));
    assert.match(homeController,/\$presentation\['courses'\]\['limit'\]/);
    assert.match(homeController,/\$presentation\['events'\]\['limit'\]/);
    assert.match(homeController,/\$presentation\['community'\]\['limit'\]/);
});
