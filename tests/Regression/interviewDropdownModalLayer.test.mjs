import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('interview modal dropdowns render above the modal backdrop without globally raising other dropdowns', () => {
    const choice = read('resources/js/components/admin/AdminChoice.tsx');
    const page = read('resources/js/pages/admin/InterviewCatalog.tsx');
    const modalCss = read('resources/css/pm-interview-admin.css');
    const sharedCss = read('resources/css/pm-admin.css');
    assert.match(choice, /contentClassName\?: string/);
    assert.match(choice, /'pm-admin-choice-content', contentClassName/);
    const overlayZ = Number(modalCss.match(/\.pm-interview-admin-modal-overlay\{[^}]*z-index:(\d+)/)?.[1]);
    const modalMenuZ = Number(modalCss.match(/\.pm-admin-choice-content\.pm-interview-admin-choice-content\{z-index:(\d+)/)?.[1]);
    const standardMenuZ = Number(sharedCss.match(/\.pm-admin-choice-content\{z-index:(\d+)/)?.[1]);
    assert.ok(modalMenuZ > overlayZ && overlayZ > standardMenuZ, 'Modal menu should be above overlay; default menu must stay unchanged');

    for (const control of ['interview-import-set', 'interview-option-group', 'interview-question-set', 'interview-question-type']) {
        assert.match(page, new RegExp(`id="${control}" contentClassName="pm-interview-admin-choice-content"`));
    }
    assert.match(page, /id=\{`interview-set-\$\{field\}`\}[^\n]*contentClassName="pm-interview-admin-choice-content"/);
    assert.match(page, /id="interview-filter-set" label="Question set"/);
    assert.doesNotMatch(page, /id="interview-filter-set" contentClassName="pm-interview-admin-choice-content"/);
});
