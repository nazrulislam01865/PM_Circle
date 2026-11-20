import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { shouldShowSiteFooter } from '../../resources/js/components/pm/siteFooterVisibility.ts';

const read = filename => readFileSync(new URL(`../../${filename}`, import.meta.url), 'utf8');
const sections = read('resources/js/components/admin/homepage-sections.ts');
const editor = read('resources/js/pages/admin/Homepage.tsx');
const fields = read('resources/js/components/admin/HomepageFields.tsx');
const controller = read('app/Http/Controllers/Admin/HomepageController.php');
const request = read('app/Http/Requests/Admin/UpdateHomepageRequest.php');
const publicHome = read('resources/js/pages/public/Home.tsx');

const homepageKeys = [
    'hero', 'pathway', 'ai_features', 'scenario', 'community',
    'members', 'skills', 'career_features', 'careers',
];

test('all public homepage sections are exposed in the sidebar and editor', () => {
    for (const key of homepageKeys) {
        assert.ok(sections.includes(`key: '${key}'`), key);
        assert.ok(editor.includes(`selected === '${key}'`), `${key}: editor missing`);
    }
    assert.match(controller, /'ai_features'/);
    assert.match(request, /content\.sections/);
    assert.match(publicHome, /visible\('ai_features'\)/);
});

test('default icons display as fixed previews rather than selectable dropdowns', () => {
    assert.doesNotMatch(editor, /Built-in icon.*kind: 'select'/);
    for (const category of ['pathway_step_icon', 'pathway_exam_icon', 'skills_icon', 'careers_feature_icon']) {
        assert.ok(editor.includes(`kind: 'fixed-icon', category: '${category}'`), category);
    }
    assert.match(fields, /fallbackPreview/);
    assert.match(fields, /homepageDefaultIcon/);
    assert.match(fields, /Use default/);
    assert.match(fields, /collapsible/);
});

test('homepage AI cards stay separate from AI request, credits and moderation processing', () => {
    const defaults = read('config/home-ai-features.php');
    assert.equal((defaults.match(/'illustration' =>/g) ?? []).length, 4);
    assert.match(controller, /HomeAiFeaturesContent::withDefaults/);
    assert.match(request, /content\.ai_features\.cards/);
    assert.match(publicHome, /content\.ai_features/);
});

test('public homepage uses the single existing shared footer and editor', () => {
    assert.equal(shouldShowSiteFooter('/'), true);
    assert.equal(shouldShowSiteFooter('/home'), true);
    assert.equal(shouldShowSiteFooter('/dashboard'), false);
    assert.equal(shouldShowSiteFooter('/exams/pmp/attempts/5'), false);
    assert.doesNotMatch(editor, /\/admin\/footer/);
    assert.doesNotMatch(sections, /key: 'footer'/);
    const sidebar = read('resources/js/layouts/admin/AdminLayout.tsx');
    assert.match(sidebar, /base === '\/admin\/navigation'/);
    assert.match(sidebar, /Shared site footer/);
    assert.match(sidebar, /href="\/admin\/footer"/);
    assert.match(read('resources/js/layouts/pm/PublicLayout.tsx'), /<SiteFooter/);
    assert.doesNotMatch(publicHome, /<PmpPublicFooter/);
});

test('homepage actions use editable destinations with server-side route rules', () => {
    for (const key of [
        'pathway.exams.compare_url', 'pathway.banner.button_url', 'members.button_url',
    ]) assert.ok(editor.includes(key), key);
    assert.match(request, /content\.pathway\.exams\.items\.\*\.button_url/);
    assert.match(request, /content\.pathway\.exams\.items\.\*\.plans_url/);
    assert.match(request, /HomepageMasterData::isAllowedNewValue/);
});
