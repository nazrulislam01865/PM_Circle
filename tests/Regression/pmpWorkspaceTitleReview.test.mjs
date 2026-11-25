import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
test('member exam titles use a single central compact role on every dashboard tab and result/review', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    assert.match(tokens, /--pm-member-workspace-title: var\(--pm-guide-text-h2\)/);
    const workspace = read('resources/css/pm-pmp-workspace.css');
    assert.match(workspace, /\.pm-pmp-workspace h1 \{ font-size:var\(--pm-member-workspace-title\)/);
    assert.doesNotMatch(workspace, /\.pm-pmp-workspace h1 \{[^}]*var\(--text-h1\)/);
    const panels = read('resources/js/components/exam/PmpWorkspacePanels.tsx');
    assert.doesNotMatch(panels, /<PagePill>/);
    for (const title of ['My PMP Exam Simulator', 'Performance and Preparation', 'Exam history', 'AI usage and refills']) assert.ok(panels.includes(`<h1>${title}</h1>`));
    for (const path of ['resources/css/pm-pmp-review-prototype.css', 'resources/css/pm-exam-simulator.css']) assert.ok(read(path).includes('font-size: var(--pm-member-workspace-title)'));
});
test('review uses two responsive grids and preserves missing-content honesty', () => {
    const css = read('resources/css/pm-pmp-review-prototype.css');
    assert.match(css, /\.pm-review-reference-grid \{ display: grid; grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /@container member-workspace \(max-width: 40\.625rem\)/);
    const review = read('resources/js/components/exam/PmpReviewExplanation.tsx');
    assert.ok(review.includes('No concept connection has been provided for this question.'));
    assert.ok(review.includes('Section page range'));
});
