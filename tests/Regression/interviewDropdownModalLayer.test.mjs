import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('interview modal dropdowns render above the modal backdrop using the centralized floating layer', () => {
    const choice = read('resources/js/components/admin/AdminChoice.tsx');
    const page = read('resources/js/pages/admin/InterviewCatalog.tsx');
    const modalCss = read('resources/css/pm-interview-admin.css');
    const sharedCss = read('resources/css/pm-admin.css');
    assert.match(choice, /contentClassName\?: string/);
    assert.match(choice, /'pm-admin-choice-content', contentClassName/);
    const tokens = read('resources/css/pm-design-tokens.css');
    const overlayZ = Number(tokens.match(/--pm-guide-dialog-layer:\s*(\d+)/)?.[1]);
    const menuZ = Number(tokens.match(/--pm-guide-floating-layer:\s*(\d+)/)?.[1]);
    assert.ok(menuZ > overlayZ && overlayZ > 121);
    assert.match(sharedCss, /\.pm-admin-choice-content\{z-index:var\(--pm-guide-floating-layer\)/);
    assert.doesNotMatch(modalCss, /z-index:\s*\d+/);
    assert.match(page, /<DialogContent className="pm-interview-admin-modal/);

    for (const control of ['interview-import-set', 'interview-option-group', 'interview-question-set', 'interview-question-type']) {
        assert.match(page, new RegExp(`id="${control}" contentClassName="pm-interview-admin-choice-content"`));
    }
    assert.match(page, /id=\{`interview-set-\$\{field\}`\}[^\n]*contentClassName="pm-interview-admin-choice-content"/);
    assert.match(page, /id="interview-filter-set" label="Question set"/);
    assert.doesNotMatch(page, /id="interview-filter-set" contentClassName="pm-interview-admin-choice-content"/);
});
