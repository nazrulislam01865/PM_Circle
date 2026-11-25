import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-pmp-workspace.css');
const panels = read('resources/js/components/exam/PmpWorkspacePanels.tsx');
test('workspace body, headings, labels and actions use their approved central roles', () => {
    assert.match(css, /\.pm-pmp-workspace \{[^}]*var\(--pm-guide-text-body\)\/var\(--pm-guide-line-body\) var\(--pm-guide-font\)/);
    assert.match(css, /\.pm-pmp-workspace h2 \{[^}]*var\(--bold\) var\(--pm-guide-text-h3\)\/var\(--pm-guide-line-h3\)/);
    assert.match(css, /\.pm-pmp-primary,\.pm-pmp-secondary \{[^}]*var\(--pm-guide-weight-control\) var\(--pm-guide-text-control\)\/var\(--pm-guide-line-control\)/);
    for (const name of ['Current Plan ·', 'Mock Exams', 'AI Tokens']) assert.ok(panels.includes(`<h2>${name}`));
    assert.match(css, /\.pm-pmp-ai-ledger-row > div > small \{ font-size:var\(--pm-guide-text-body\)/);
    assert.match(css, /\.pm-pmp-refill-unavailable \{[^}]*font-size:var\(--pm-guide-text-body\)/);
    assert.doesNotMatch(css, /min-height:\s*var\(--control-compact\)/);
});
test('numbers, tables and chart labels have independent central semantic roles', () => {
    assert.match(css, /\.pm-pmp-dual-stats strong \{[^}]*var\(--text-stat\)/);
    assert.match(css, /\.pm-pmp-ai-stats strong \{[^}]*var\(--text-stat\)/);
    assert.match(css, /\.pm-pmp-axis-text \{[^}]*var\(--pm-guide-text-meta\)/);
    assert.match(css, /\.pm-pmp-chart-scroll \{[^}]*overflow-x:auto/);
    assert.match(panels, /new ResizeObserver\(update\)/);
    assert.match(panels, /viewBox=\{`0 0 \$\{size.width\} \$\{size.height\}`\}/);
    assert.match(panels, /<th scope="col">Exam<\/th>/);
    assert.match(css, /@container member-workspace \(max-width: 33\.75rem\)/);
});
