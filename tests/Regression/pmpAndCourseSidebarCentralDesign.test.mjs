import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const course = read('resources/css/pm-course-workspace.css');
const pmp = read('resources/css/pm-pmp-workspace.css');
const panels = read('resources/js/components/exam/PmpWorkspacePanels.tsx');
const lesson = read('resources/js/pages/learning/Lesson.tsx');
const rule = (css, selector) => css.split(`\n${selector} {`).slice(1).map(part => part.split('}')[0]).join(' ');
test('lesson navigation distinguishes title and metadata and aligns wrapped completed titles', () => {
    assert.match(rule(course,'.pm-course-lesson-item-title'), /display: flex;.*var\(--text-h4\)\/var\(--line-h4\)/);
    assert.match(rule(course,'.pm-course-lesson-item > span'), /var\(--regular\) var\(--pm-guide-text-meta\)/);
    assert.match(rule(course,'.pm-course-lesson-completed-icon'), /flex: none/);
    assert.match(lesson, /<span>\{item.title\}<\/span><\/strong>/);
    assert.match(rule(course,'.pm-course-lesson-sidebar'), /gap: var\(--pm-guide-card-gap\)/);
    assert.match(rule(course,'.pm-course-lesson-sidebar .pm-course-workspace-progress'), /margin: 0/);
});
test('all PMP dashboard card families use the approved card radius, padding and gaps', () => {
    for (const selector of ['.pm-pmp-surface','.pm-pmp-panel','.pm-pmp-ai-stats > div','.pm-pmp-insight','.pm-pmp-history-details']) {
        assert.match(rule(pmp, selector), /border-radius:var\(--radius-card\)/);
        assert.match(rule(pmp, selector), /padding:var\(--pm-guide-card-padding\)/);
    }
    for (const selector of ['.pm-pmp-overview-cards','.pm-pmp-metric-grid','.pm-pmp-analysis-grid','.pm-pmp-summary-strip','.pm-pmp-ai-main','.pm-pmp-history-surface']) assert.match(rule(pmp,selector), /gap:var\(--pm-guide-card-gap\)/);
});
test('dashboard buttons use shared control geometry and disabled semantic colours', () => {
    const base = rule(pmp,'.pm-pmp-workspace :is(.pm-pmp-primary,.pm-pmp-secondary)');
    assert.match(base,/min-height:var\(--control-height\)/);
    assert.match(base,/padding:var\(--pm-guide-s2\) var\(--pm-guide-button-pad-inline\)/);
    assert.match(rule(pmp,'.pm-pmp-workspace :is(.pm-pmp-primary,.pm-pmp-secondary):disabled'), /background:var\(--disabled-bg\); color:var\(--disabled-text\)/);
});
test('AI usage heading has no leading icon while refresh and metric icons remain', () => {
    assert.match(panels, /className="pm-pmp-ai-lead"><div>\s*<h1>AI usage and refills<\/h1>/);
    assert.match(panels, /aria-label="Refresh AI usage"/);
    assert.match(panels, /<IconTile>\{item.icon\}<\/IconTile>/);
});
