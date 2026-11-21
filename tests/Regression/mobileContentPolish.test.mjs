import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-mobile-content-polish.css');
const app = read('resources/css/app.css');

test('only four intended pages receive mobile-specific styling via central tokens', () => {
    assert.match(app, /@import '\.\/pm-mobile-content-polish\.css'/);
    for (const name of ['pm-community-discussions-page', 'pm-activity-page', 'pm-achievements-page', 'pm-saved-posts-page']) {
        assert.match(css, new RegExp(name));
    }
    assert.match(css, /@media \(max-width: 42rem\)/);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|oklch\(/i);
});

test('activity filters, clear and load-more actions remain intact', () => {
    const page = read('resources/js/pages/account/ActivityLog.tsx');
    assert.match(page, /onClick=\{clearHistory\}/);
    assert.match(page, /onClick=\{loadMore\}/);
    assert.match(page, /currentFilters\.type/);
    assert.match(page, /currentFilters\.range/);
    assert.match(page, /currentFilters\.sort/);
    assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test('achievements and saved posts retain dynamic data, links and an accessible empty icon', () => {
    const achievements = read('resources/js/pages/account/Achievements.tsx');
    const saved = read('resources/js/pages/community/SavedPosts.tsx');
    const component = read('resources/js/components/pm/ContentPage.tsx');
    assert.match(achievements, /paths\.map/);
    assert.match(achievements, /badges\.map/);
    assert.match(saved, /posts\.data\.map/);
    assert.match(saved, /href="\/community"/);
    assert.match(component, /aria-hidden="true"/);
    assert.match(achievements, /className="pm-achievements-page"/);
    assert.match(saved, /className="pm-saved-posts-page"/);
});

test('community search has a working submit action while inert sort is absent', () => {
    const page = read('resources/js/pages/community/Feed.tsx');
    assert.doesNotMatch(page, /className="pm-sort-dropdown"/);
    assert.match(page, /onSubmit=\{handleSearchSubmit\}/);
    assert.match(page, /type="submit" aria-label="Search discussions"/);
    assert.match(page, /<FeedScopeTabs /);
    assert.match(page, /<PostCard /);
});

test('authenticated mobile content uses only the shell gutter on both sides', () => {
    const shell = read('resources/css/pm-member-shell.css');
    const mobile = read('resources/css/pm-mobile-layout.css');
    const memberPages = read('resources/css/pm-member-pages.css');
    assert.match(shell, /\.pm-member-shell \.pm-dash-body\s*\{\s*width: calc\(100% - 32px\)/);
    assert.match(memberPages, /\.pm-dashboard \.pm-member-public-content > \.pm-container\s*\{[\s\S]*?width: 100%/);
    assert.match(mobile, /\.pm-app\.pm-member-shell \.pm-member-public-content > \.pm-container\s*\{\s*width: 100%;/);
    // Never apply the member-only fix to the unauthenticated public shell.
    assert.match(mobile, /\.pm-app:not\(\.pm-auth-shell\) \.pm-container/);
    for (const page of [
        'resources/js/pages/account/ActivityLog.tsx',
        'resources/js/pages/account/Achievements.tsx',
        'resources/js/pages/community/Feed.tsx',
        'resources/js/pages/community/SavedPosts.tsx',
    ]) {
        assert.match(read(page), /pm-container|ContentPage/);
    }
});
