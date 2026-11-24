import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const common = read('resources/css/pm-circle.css');
const daily = read('resources/css/pm-daily-challenge.css');
const posts = read('resources/css/pm-unified-post-card.css');
const tokens = read('resources/css/pm-design-tokens.css');
const mobile = read('resources/css/pm-mobile-content-polish.css');
const member = read('resources/css/pm-member-pages.css');
function rule(css, selector) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, selector);
    return css.slice(start, css.indexOf('}', start) + 1);
}
test('community and scenario cards use the same approved 16px padding and card rhythm', () => {
    assert.match(tokens, /--pm-guide-card-padding: var\(--pm-guide-s4\)/);
    assert.match(tokens, /--pm-guide-card-gap: var\(--pm-guide-s4\)/);
    for (const selector of ['.pm-feed-hero', '.pm-guest-banner-card', '.pm-inline-guest-prompt', '.pm-sidebar-card', '.pm-cta-guest-card', '.pm-scenario-submit-card', '.pm-response-card']) {
        assert.match(rule(common, selector), /padding: var\(--pm-guide-card-padding\)/);
    }
    for (const selector of ['.pm-scenario-detail-layout .pm-scenario-detail-article', '.pm-scenario-detail-layout .pm-scenario-detail-aside-card', '.pm-scenario-detail-decision', '.pm-challenge-item']) {
        assert.match(rule(daily, selector), /padding: var\(--pm-guide-card-padding\)/);
    }
    assert.match(rule(posts, '.pm-unified-post-card'), /padding: var\(--pm-guide-card-padding\)/);
    assert.match(rule(member, '.pm-dashboard .pm-member-public-content .pm-feed-hero'), /padding: var\(--pm-guide-card-padding\)/);
    assert.doesNotMatch(mobile, /\.pm-community-discussions-page \.pm-unified-post-card \{[^}]*padding:/);
});
test('guest prompt uses the same bottom gap as the virtualized post, not an extra top margin', () => {
    assert.match(rule(common, '.pm-inline-guest-prompt'), /margin: 0 0 var\(--pm-guide-card-gap\)/);
    assert.match(rule(posts, '.pm-unified-post-card'), /margin: 0 0 var\(--pm-guide-card-gap\)/);
    assert.match(rule(common, '.pm-inline-guest-actions'), /flex-wrap: wrap/);
});
test('post headings match their markup and post content does not inherit profile padding', () => {
    assert.match(rule(posts, '.pm-unified-post-card .pm-post-card-main .pm-card-title'), /var\(--text-h3\)\/var\(--line-h3\)/);
    assert.match(rule(posts, '.pm-unified-post-card.pm-post-detail-card .pm-card-title'), /var\(--text-h1\)\/var\(--line-h1\)/);
    assert.match(rule(posts, '.pm-unified-post-card .pm-post-card-main .pm-card-body'), /padding: 0/);
    assert.match(rule(common, '.pm-button'), /padding: var\(--pm-guide-s2\) var\(--pm-guide-button-pad-inline\)/);
});
