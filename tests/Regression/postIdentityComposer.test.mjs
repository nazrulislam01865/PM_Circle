import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const component = name => read(`resources/js/components/community/${name}.tsx`);

test('named post identities use one privacy-aware member link and dashboard retains the existing author ID', () => {
    const identity = component('PostAuthorLinks');
    assert.match(identity, /sample \|\| post\.is_anonymous \|\| !post\.author\.id \|\| \(!post\.author\.profile && !post\.viewer_is_author\)/);
    assert.match(identity, /`\/members\/\$\{post\.author\.id\}`/);
    for (const name of ['PostCard', 'PostCardV2']) {
        const card = component(name);
        assert.match(card, /<PostAuthorLink href=\{authorHref\} name=\{post\.author\.name\} avatar unavailable=\{authorUnavailable\}>/);
        assert.match(card, /<strong><PostAuthorLink href=\{authorHref\}/);
        assert.match(card, /pm-unified-post-body-link/);
    }
    assert.match(read('app/Domain/Community/Queries/FeedQuery.php'), /'authorId' => ! empty\(\$post\['is_anonymous'\]\) \? null : \(\$author\['id'\] \?\? null\)/);
    assert.match(read('resources/js/components/dashboard/DashboardFeed.tsx'), /id: post\.authorId \?\? undefined/);
});

test('post titles retain their text color and do not acquire a hover underline', () => {
    assert.match(read('resources/css/pm-circle.css'), /\.pm-card-title a:hover\s*\{\s*color: inherit;\s*text-decoration: none;/);
    assert.match(read('resources/css/pm-home-v2-sections.css'), /\.pm-v2-post-card \.pm-v2-post-content h3 a:hover \{ color: inherit; text-decoration: none; \}/);
});

test('composer uses the shared modal layer and owns its scroll region with shared control and dialog tokens', () => {
    const dialog = component('PostComposerDialog');
    const css = read('resources/css/pm-post-composer.css');
    assert.match(dialog, /overlayClassName="pm-compose-overlay" closeClassName="pm-compose-close"/);
    assert.match(dialog, /<label htmlFor="pm-compose-identity">Post as<\/label>/);
    assert.match(dialog, /onCloseAutoFocus/);
    assert.match(dialog, /pm-compose-scroll-region[\s\S]*pm-compose-editor-field[\s\S]*pm-compose-footer/);
    assert.doesNotMatch(css, /z-index: var\(--pm-compose-(?:overlay|dialog)-layer\)/);
    assert.match(read('resources/css/pm-modal-layer.css'), /\[data-slot="dialog-overlay"\][^}]*z-index: var\(--pm-guide-dialog-layer\)/s);
    assert.match(css, /\.pm-compose-dialog\[data-slot='dialog-content'\][^}]*height: auto; max-height: calc\(100dvh/);
    assert.match(css, /\.pm-compose-scroll-region[^}]*overflow-y: auto/);
    assert.match(css, /\.pm-compose-footer \{ flex: none/);
    assert.match(css, /border-radius: var\(--pm-guide-radius-feature\)/);
    for (const path of ['pm-post-alignment.css','pm-community-consistency.css','pm-post-management.css']) assert.doesNotMatch(read(`resources/css/${path}`), /\.pm-compose-prototype/);
});
