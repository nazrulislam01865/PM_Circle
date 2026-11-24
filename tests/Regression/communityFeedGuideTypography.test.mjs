import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(path.join(root, file), 'utf8');
const main = read('resources/css/pm-circle.css');
const member = read('resources/css/pm-member-pages.css');
const mobile = read('resources/css/pm-mobile-content-polish.css');
const page = read('resources/js/pages/community/Feed.tsx');
const tokens = read('resources/css/pm-design-tokens.css');

function rule(css, selector) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `Missing selector: ${selector}`);
    return css.slice(start, css.indexOf('}', start) + 1);
}

test('guest hero H1/lead use semantic guideline instead of legacy statistic and body roles', () => {
    const h1 = rule(main, '.pm-feed-hero-content h1');
    assert.match(h1, /font-size: var\(--text-h1\)/);
    assert.match(h1, /line-height: var\(--line-h1\)/);
    assert.match(h1, /font-weight: var\(--pm-guide-static-h1-weight\)/);
    assert.doesNotMatch(h1, /pm-font-size-32px|text-stat/);
    const lead = rule(main, '.pm-feed-hero-content p');
    assert.match(lead, /font-size: var\(--pm-guide-text-lead\)/);
    assert.match(rule(main, '.pm-badge-public'), /font-size: var\(--pm-guide-text-meta\)/);
    assert.match(rule(main, '.pm-feed-search-input'), /font-size: var\(--text-ui\)/);
});

test('member layout uses exactly the same heading/lead roles', () => {
    const h1 = rule(member, '.pm-dashboard .pm-member-public-content .pm-feed-hero-content h1');
    assert.match(h1, /font-size: var\(--text-h1\)/);
    assert.match(h1, /line-height: var\(--line-h1\)/);
    const lead = rule(member, '.pm-dashboard .pm-member-public-content .pm-feed-hero-content p');
    assert.match(lead, /font-size: var\(--pm-guide-text-lead\)/);
});

test('mobile selectors do not downgrade the discussion H1 or lead to H2/meta', () => {
    assert.match(mobile, /\.pm-community-discussions-page \.pm-feed-hero-content h1\s*\{\s*font-size: var\(--text-h1\)/);
    assert.match(mobile, /\.pm-community-discussions-page \.pm-feed-hero-content p \{ font-size: var\(--pm-guide-text-lead\)/);
    assert.match(mobile, /\.pm-community-discussions-page \.pm-badge-public \{[^}]*font-size: var\(--pm-guide-text-meta\)/);
});

test('community sidebar heading, label, and descriptions use their actual H3/meta/body roles', () => {
    for (const [selector, property] of [
        ['.pm-sidebar-card h3', 'font-size: var(--text-h3)'],
        ['.pm-sidebar-card p', 'font-size: var(--text-body)'],
        ['.pm-sidebar-kicker', 'font-size: var(--pm-guide-text-meta)'],
    ]) assert.ok(rule(main, selector).includes(property), `${selector} missing ${property}`);
    assert.match(rule(main, '.pm-community-discussions-page .pm-community-cta-copy'), /font-size: var\(--text-body\)/);
    assert.match(rule(main, '.pm-community-discussions-page .pm-community-cta-heading'), /font-size: var\(--text-h3\)/);
});

test('shared tokens follow uploaded Inter guideline; page business logic is untouched', () => {
    assert.match(tokens, /--pm-guide-text-h1: clamp\(2rem, 5vw, 3\.1rem\)/);
    assert.match(tokens, /--pm-guide-text-lead: 1\.0625rem/);
    assert.match(tokens, /--pm-guide-text-h3: 1\.125rem/);
    assert.match(page, /const feed = useSlidingFeed\(posts,/);
    assert.match(page, /<PostCard post=\{post\}/);
});
