import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const component = name => read(`resources/js/components/community/${name}.tsx`);
const css = read('resources/css/pm-mobile-layout.css');
test('real mobile posts share a single secondary action state and use the existing roster', () => {
    for (const name of ['PostCard', 'PostCardV2']) {
        const source = component(name);
        assert.match(source, /usePostSecondaryActions\(/);
        assert.match(source, /<PostActionMenu[\s\S]*?secondary=/);
        assert.match(source, /<PostEngagementActions[\s\S]*?secondary=\{secondary\}/);
    }
    const actions = component('PostEngagementActions');
    assert.match(actions, /isMobile && \(summaryTotal > 0 \? reactionSummary/);
    assert.match(actions, /!isMobile && reactionSummary/);
    assert.match(actions, /showCount=\{false\}/);
    assert.equal((actions.match(/<PostReactionSummary/g) || []).length, 1);
    assert.match(component('PostReactions'), /\/reactions\/users\?/);
    assert.match(component('PostActionMenu'), /isMobile && secondary/);
    assert.match(component('PostActionMenu'), /secondary\.toggleSave\(\)/);
    assert.match(css, /@media \(max-width: 767px\)/);
    assert.match(css, /\.pm-post-desktop-action,[\s\S]*?\.pm-read-discussion-link \{ display: none; \}/);
});
test('mobile filter disclosure is shared and does not discard selected fields', () => {
    const source = read('resources/js/components/pm/MobileFilterPanel.tsx');
    assert.match(source, /useState\(false\)/);
    assert.match(source, /aria-expanded=\{expanded\}/);
    assert.match(source, /aria-controls=\{id\}/);
    assert.match(source, /activeCount/);
    assert.match(source, /\{children\}/);
    for (const path of ['components/scenarios/ScenarioLibraryFilters.tsx','components/learning/PublicCourseCatalog.tsx','pages/learning/Catalog.tsx']) {
        assert.match(read(`resources/js/${path}`), /<MobileFilterPanel[\s\S]*?activeCount=/);
    }
    assert.match(css, /data-mobile-expanded="false"\] > \.pm-mobile-filter-content \{ display: none; \}/);
});
test('mobile header and homepage layout avoid fixed-height promotion collisions', () => {
    const styles = read('resources/css/pm-home-v2-responsive.css');
    assert.match(styles, /\.pm-v2-offer-bar \{ position: relative; top: auto;/);
    assert.match(styles, /\.pm-home-v2-shell:has\(> \.pm-v2-offer-bar\) > \.pm-v2-header \{ top: 0; \}/);
    assert.match(styles, /\.pm-v2-header-nav \.pm-v2-mobile-login \{ display: flex; \}/);
    assert.match(styles, /\.pm-v2-course-track \{ grid-auto-columns: 100%; \}/);
    assert.match(styles, /\.pm-v2-community-sidebar \{ grid-template-columns: minmax\(0,1fr\); \}/);
    assert.match(styles, /\.pm-v2-section-heading \{ flex-direction: column;/);
});
