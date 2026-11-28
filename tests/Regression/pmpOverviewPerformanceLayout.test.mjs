import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-pmp-workspace.css');
const panels = read('resources/js/components/exam/PmpWorkspacePanels.tsx');
const rule = selector => css.split(`${selector} {`).slice(1).map(part => part.split('}')[0]).join(' ');
test('overview actions are bottom aligned in equal-height cards without fixed heights', () => {
    assert.match(rule('.pm-pmp-overview-cards > .pm-pmp-panel'), /display:flex; flex-direction:column; gap:var\(--pm-guide-card-gap\)/);
    assert.match(rule('.pm-pmp-overview-cards > .pm-pmp-panel > .pm-pmp-secondary'), /width:100%; margin-top:auto/);
    assert.match(panels, /<SecondaryLink href="\/membership">Manage Plan<\/SecondaryLink>\s*<\/Panel>/);
    assert.match(panels, /onClick=\{onAi\}>View AI Usage<\/button>\s*<\/Panel>/);
});
test('performance filter width is independent of selected labels and stacks only by workspace size', () => {
    assert.match(rule('.pm-pmp-performance-filters'), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    assert.match(rule('.pm-pmp-performance-filters'), /width: min\(100%, 34rem\)/);
    assert.match(rule('.pm-pmp-performance-filters > .pm-dropdown-trigger'), /width: 100%; min-width: 0/);
    assert.match(css, /@container member-workspace \(max-width: 36rem\)\s*\{\s*\.pm-pmp-performance-filters \{ grid-template-columns: minmax\(0, 1fr\); width: 100%;/);
    assert.match(rule('.pm-pmp-performance-filters > .pm-dropdown-trigger > span:first-child'), /white-space: normal; overflow-wrap: anywhere/);
    assert.match(panels, /<PMDropdown id="pmp-performance-category"/);
    assert.match(panels, /<PMDropdown id="pmp-performance-range"/);
});

test('exam history filters omit the redundant exam records label', () => {
    assert.doesNotMatch(panels, /Your exam records/);
    assert.doesNotMatch(css, /\.pm-pmp-history-filters (?:> )?\.pm-pmp-sample-tag/);
    for (const id of ['type', 'status', 'period']) {
        assert.ok(panels.includes(`<PMDropdown id="pmp-history-${id}"`));
    }
});

test('overview and performance omit redundant badges and performance uses the history subtitle style', () => {
    assert.doesNotMatch(panels, /Your exam activity|Your practice data|Your exam records|pm-pmp-sample-tag/);
    assert.doesNotMatch(css, /\.pm-pmp-sample-tag/);
    assert.match(panels, /<div className="pm-pmp-section-heading"><div><h1>Performance and Preparation<\/h1><p>[^<]+<\/p><\/div><\/div>\s*<div className="pm-pmp-performance-filters">/);
    const description = rule(':is(.pm-pmp-section-heading,.pm-pmp-history-heading) p');
    assert.match(description, /margin-top:var\(--s1\); color:var\(--muted\)/);
    assert.match(description, /font-size:var\(--pm-guide-text-lead\); line-height:var\(--line-body\)/);
    assert.match(rule('.pm-pmp-surface'), /gap:var\(--pm-guide-card-gap\)/);
});
