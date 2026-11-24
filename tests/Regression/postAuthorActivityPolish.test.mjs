import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const components = name => read(`resources/js/components/community/${name}.tsx`);
const css = name => read(`resources/css/${name}.css`);

test('every real post author uses a shared identity link or a privacy notice; anonymous IDs stay hidden', () => {
    const identity = components('PostAuthorLinks');
    assert.match(identity, /if \(post\.is_anonymous\) return 'anonymous'/);
    assert.match(identity, /if \(href && !unavailable\) return <Link/);
    assert.match(identity, /<DialogTrigger asChild><button type="button"/);
    assert.match(identity, /Their name, photo and public profile are not linked to this post/);
    for (const card of ['PostCard', 'PostCardV2']) {
        assert.match(components(card), /const authorUnavailable = postAuthorUnavailable\(post/);
        assert.equal((components(card).match(/unavailable=\{authorUnavailable\}/g) ?? []).length, 2);
    }
    const model = read('app/Models/Post.php');
    assert.match(model, /setRelation\('author', new User\(\['name' => 'Anonymous member'\]\)\)/);
    assert.match(model, /makeHidden\('author_id'\)/);
    assert.match(read('resources/js/pages/community/PostShow.tsx'), /authorHref=\{postAuthorHref\(post\)\}/);
    assert.match(components('PostSidebar'), /<PostAuthorLink href=\{authorHref\} name=\{name\} avatar/);
});

test('profile hover and focus use central theme without changing post title styling', () => {
    const style = css('pm-unified-post-card');
    assert.match(style, /\.pm-post-author-link:not\(\.pm-post-avatar-link\):is\(:hover, :focus-visible\) \{[^}]*color: var\(--blue\);[^}]*text-decoration: underline;/s);
    assert.match(style, /\.pm-post-avatar-link:focus-visible \{[^}]*outline: 3px solid var\(--focus\);[^}]*border-radius: var\(--radius-pill\)/s);
    assert.doesNotMatch(style, /\.pm-post-avatar-link(?=[:])[^{}]*:hover[^{}]*\{/);
    assert.match(css('pm-modal-layer'), /\[data-slot="dialog-content"\][^}]*z-index: var\(--pm-guide-dialog-layer\)/s);
    assert.match(css('pm-circle'), /\.pm-card-title a:hover\s*\{\s*color: inherit;\s*text-decoration: none;/);
});

test('public member links in reaction and comment lists reuse the existing profile endpoint', () => {
    assert.match(components('PostReactions'), /<PostAuthorLink href=\{user\.profile_url\} name=\{user\.name\} avatar>/);
    assert.match(components('InlinePostComments'), /<PostAuthorLink href=\{comment\.author\.profile_url\} name=\{comment\.author\.name\} avatar>/);
    assert.match(components('CommunityComment'), /<PostAuthorLink href=\{authorHref\} name=\{comment\.author\.name\} avatar>/);
    const controller = read('app/Http/Controllers/Community/PostInteractionController.php');
    assert.match(controller, /private function commentProfileUrl\(\?User \$author\): \?string[\s\S]*?\$author->profile\?->visibility === 'public'/);
    assert.equal((controller.match(/'profile_url' => \$this->commentProfileUrl\(/g) ?? []).length, 3);
});

test('activity groups and entries use H4, not page or section-sized headings, on every breakpoint', () => {
    const style = css('pm-activity-log'), mobile = css('pm-mobile-content-polish');
    for (const selector of ['pm-activity-day-heading', 'pm-activity-title']) {
        assert.match(style, new RegExp(`\\.${selector}\\s*\\{[^}]*font: var\\(--semibold\\) var\\(--text-h4\\)/var\\(--line-h4\\)`, 's'));
        assert.doesNotMatch(mobile, new RegExp(`\\.${selector}\\s*\\{[^}]*font(?:-size)?:`, 's'));
    }
    assert.match(style, /\.pm-activity-heading p \{[^}]*var\(--pm-guide-text-lead\)/s);
    assert.match(style, /\.pm-activity-card \{[^}]*padding: var\(--pm-guide-card-padding\)/s);
    assert.doesNotMatch(mobile, /\.pm-activity-page \.pm-activity-card \{[^}]*padding:/s);
});
