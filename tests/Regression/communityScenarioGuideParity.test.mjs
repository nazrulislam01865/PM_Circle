import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const daily = read('resources/css/pm-daily-challenge.css');
const common = read('resources/css/pm-circle.css');
const controls = read('resources/css/pm-ui-guideline.css');
const tabs = read('resources/css/pm-feed-scope.css');
const detail = read('resources/js/pages/scenarios/Show.tsx');
const feed = read('resources/js/pages/community/Feed.tsx');
const aside = read('resources/js/components/scenarios/ScenarioDetailsAside.tsx');
function rule(css, selector) {
    const start = css.indexOf(`${selector} {`);
    assert.notEqual(start, -1, `Missing selector ${selector}`);
    return css.slice(start, css.indexOf('}', start) + 1);
}

test('scenario library uses page H1 while the detail article uses section H2 and subsection H3 visual roles', () => {
    const pageHeading = rule(daily, '.pm-challenge-heading-row h1');
    assert.match(pageHeading, /font-size: var\(--text-h1\)/);
    assert.match(pageHeading, /letter-spacing: var\(--pm-guide-tracking-h1\)/);
    const sectionHeading = rule(daily, '.pm-scenario-detail-title');
    assert.match(sectionHeading, /font-size: var\(--text-h2\)/);
    assert.match(sectionHeading, /line-height: var\(--line-h2\)/);
    assert.match(sectionHeading, /font-weight: var\(--pm-guide-weight-h2\)/);
    assert.match(sectionHeading, /letter-spacing: var\(--pm-guide-tracking-h2\)/);
    assert.doesNotMatch(sectionHeading, /text-stat|text-h1/);
    const subsection = rule(daily, '.pm-scenario-detail-section h2');
    assert.match(subsection, /font-size: var\(--text-h3\)/);
    assert.match(subsection, /line-height: var\(--line-h3\)/);
    // Keep the article's accessible document heading hierarchy independent of visual scale.
    const story = read('resources/js/components/scenarios/ScenarioStoryContent.tsx');
    assert.match(story, /<h1 className="pm-scenario-detail-title">/);
    assert.match(story, /<h2 id="scenario-situation-heading">/);
    assert.match(rule(daily, '.pm-challenge-item-title'), /font-size: var\(--text-h3\)/);
    assert.match(rule(daily, '.pm-challenge-item-summary'), /font-size: var\(--text-body\)/);
    assert.match(rule(daily, '.pm-scenario-detail-aside-card h3'), /font-size: var\(--text-h3\)/);
    assert.match(aside, /<h3 id="scenario-about-heading"/);
    assert.match(rule(common, '.pm-community-responses-header h2'), /font-size: var\(--text-h2\)/);
});

test('community and scenario fields use shared control and error contracts in both shells', () => {
    for (const selector of ['.pm-feed-search-input', '.pm-inline-guest-textarea', '.pm-response-textarea', '.pm-challenge-search input', '.pm-challenge-sort-wrap select', '.pm-sort-dropdown']) {
        assert.ok(controls.includes(selector));
    }
    assert.match(controls, /\)\[aria-invalid="true"\]\s*\{\s*border-color: var\(--red\)/);
    assert.match(detail, /aria-invalid=\{Boolean\(form.errors.body\)\}/);
    assert.doesNotMatch(detail, /className="pm-sort-dropdown"\s+style=/);
    assert.match(rule(tabs, '.pm-feed-scope-tab'), /font-size: var\(--text-ui\)/);
    assert.doesNotMatch(feed, /fontSize:/);
});

test('scenario response body avoids the profile card padding and keeps the original text', () => {
    assert.match(rule(daily, '.pm-scenario-detail-page .pm-response-card > .pm-card-body'), /padding: 0/);
    assert.match(rule(daily, '.pm-scenario-detail-page .pm-response-card > .pm-card-body'), /var\(--text-body\)\/var\(--line-body\)/);
    assert.match(detail, /\{resp.body\}/);
    assert.match(detail, /<ScenarioStoryContent scenario=\{scenario\}/);
    assert.match(detail, /<ScenarioDetailsAside scenario=\{scenario\}/);
    assert.match(feed, /<PostCard post=\{post\}/);
});
