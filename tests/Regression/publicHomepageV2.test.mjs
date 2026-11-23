import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('public-home prototype composition respects administrator visibility and shared layout', () => {
    const page = read('resources/js/pages/public/Home.tsx');
    for (const component of ['HomeHero', 'HomeCertification', 'HomeCourses', 'HomeCommunity', 'HomeAiPractice', 'HomeResume', 'HomeEvents']) {
        assert.match(page, new RegExp(`<${component}\\b`), component);
    }
    for (const section of ['hero', 'pathway', 'ai_features', 'scenario', 'community', 'members', 'skills', 'careers']) {
        assert.ok(page.includes(`visible('${section}')`), section);
    }
    assert.match(page, /<PublicLayout siteLayout homePrototype/);
    const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
    assert.match(layout, /const showHomeHeader = homePrototype \|\| isGuest/);
    assert.match(layout, /showHomeHeader \? <HomeHeader eventsVisible=\{homeEventsVisible\}\/> : <SiteHeader/);
    assert.match(layout, /homePrototype \? 'home' : footerVariant/);
});

test('the V2 post card reuses existing moderation-safe display and engagement services', () => {
    const card = read('resources/js/components/community/PostCardV2.tsx');
    assert.match(card, /PostEngagementActions/);
    assert.match(card, /PostContent/);
    assert.match(card, /post\.ai_generated/);
    assert.match(card, /PreviewEngagementActions/);
    assert.match(card, /buttonLabel="React"/);
    assert.doesNotMatch(card, /dangerouslySetInnerHTML/);
    assert.doesNotMatch(card, /fetch\(/);
});

test('published catalog data only and no new database event writes', () => {
    const controller = read('app/Http/Controllers/PublicSite/HomeController.php');
    assert.match(controller, /LearningCourse::query\(\)->where\('is_published', true\)/);
    assert.match(controller, /->limit\(8\)/);
    assert.match(controller, /->catalogData\(\)/);
    const events = read('resources/js/components/home/v2/HomeEvents.tsx');
    assert.match(events, /not published or open for booking/);
    assert.doesNotMatch(events, /router\.(post|put|delete)|fetch\(/);
});

test('source files, local fallback media and centrally selected prototype typeface exist', () => {
    const photos = read('resources/js/components/home/v2/reference.ts');
    const homePhoto = read('resources/js/components/home/v2/HomePhoto.tsx');
    assert.match(homePhoto, /onError/);
    assert.match(homePhoto, /loading=\{eager \? 'eager' : 'lazy'\}/);
    assert.match(photos, /photoFallbacks/);
    for (const file of ['resources/css/pm-home-v2-layout.css', 'resources/css/pm-home-v2-sections.css', 'resources/css/pm-home-v2-responsive.css']) {
        assert.ok(existsSync(new URL(`../../${file}`, import.meta.url)), file);
    }
    assert.match(read('resources/css/pm-design-tokens.css'), /--font-ui:\s*"Inter"/);
    assert.match(read('resources/views/app.blade.php'), /family=Inter/);
    const layout = read('resources/css/pm-home-v2-layout.css');
    assert.match(layout, /pm-v2-section-heading-font/);
    assert.match(layout, /pm-v2-exam-card\s+\.pm-v2-card-image/);
    assert.match(layout, /pm-v2-course-card\s+\.pm-v2-card-content/);
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-home-v2-layout\.css';/);
});


test('public-home proportions match the supplied desktop section references', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    const responsive = read('resources/css/pm-home-v2-responsive.css');
    const layout = read('resources/css/pm-home-v2-layout.css');
    const sections = read('resources/css/pm-home-v2-sections.css');
    assert.match(tokens, /--pm-v2-container-width:\s*min\(70\.2vw, var\(--pm-v2-width\)\)/);
    assert.match(responsive, /max-width:\s*1500px[^}]*\{[^}]*min\(70\.2vw/);
    assert.match(layout, /pm-v2-exam-card \.pm-v2-card-content \{ min-height: 205px/);
    assert.match(layout, /pm-v2-course-card \.pm-v2-card-content \{ min-height: 290px/);
    assert.match(sections, /\.pm-v2-post-actions \.pm-home-action/);
    assert.match(sections, /pm-v2-scenario-card, \.pm-v2-post-card[^}]*overflow: visible/);
    assert.match(tokens, /--pm-v2-font-section-heading: var\(--pm-guide-text-h2\)/);
});

test('search control delegates to existing filtered routes without new database search endpoint', () => {
    const header = read('resources/js/components/home/v2/HomeHeader.tsx');
    const search = read('resources/js/components/home/v2/HomeSearch.tsx');
    assert.match(header, /<HomeSearch onClose=/);
    assert.match(header, /aria-expanded=\{searchOpen\}/);
    assert.match(search, /router\.get\('\/community', \{ search: searchText \}/);
    assert.match(search, /'\/daily-challenge'/);
    assert.match(search, /'\/members'/);
    assert.match(search, /'\/careers'/);
    assert.match(search, /event\.key === 'Escape'/);
    assert.doesNotMatch(search, /fetch\(/);
});

test('prototype post and scenario preview actions are not fake mutation endpoints', () => {
    const preview = read('resources/js/components/home/v2/PreviewEngagementActions.tsx');
    const community = read('resources/js/components/home/v2/HomeCommunity.tsx');
    assert.match(preview, /EngagementActionBar/);
    assert.match(preview, /<ReactionPicker/);
    assert.match(preview, /canInteract=\{false\}/);
    assert.match(preview, /onJoin\('save a post'\)/);
    assert.doesNotMatch(preview, /fetch\(|router\.(post|delete|put)/);
    assert.match(community, /<PreviewEngagementActions/);
    assert.match(community, /<ReactionPicker/);
});
