import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = name => read(`resources/css/${name}.css`);
const ui = name => read(`resources/js/components/ui/${name}.tsx`);
test('all shared modal portals cover the member shell with the centralized backdrop and layer', () => {
    const tokens = css('pm-design-tokens');
    const modal = Number(tokens.match(/--pm-guide-dialog-layer:\s*(\d+)/)?.[1]);
    const floating = Number(tokens.match(/--pm-guide-floating-layer:\s*(\d+)/)?.[1]);
    const shell = [...css('pm-member-sidebar-restore').matchAll(/z-index:\s*(\d+)/g)].map(m => Number(m[1]));
    assert.ok(modal > Math.max(...shell) && floating > modal);
    assert.match(css('app'), /@import '\.\/pm-modal-layer\.css'/);
    const rules = css('pm-modal-layer');
    assert.match(rules, /\[data-slot="dialog-overlay"\], \[data-slot="sheet-overlay"\]\)\s*\{[^}]*inset: 0;[^}]*z-index: var\(--pm-guide-dialog-layer\);[^}]*background: var\(--pm-guide-dialog-backdrop\)/s);
    assert.match(rules, /\[data-slot="dialog-content"\], \[data-slot="sheet-content"\]\)\s*\{[^}]*z-index: var\(--pm-guide-dialog-layer\)/s);
    for (const name of ['dialog','sheet','dropdown-menu','select','tooltip']) assert.doesNotMatch(ui(name), /\bz-50\b/);
    assert.match(rules, /\[data-slot="select-content"\][^}]*z-index: var\(--pm-guide-floating-layer\)/s);
});
test('specialized exam and reward modal layers agree with the shared layer; legacy inline dialogs use portals', () => {
    for (const file of ['pm-pmp-start-dialog','pm-reward-offer-dialog','pm-exam-simulator','pm-admin']) assert.match(css(file), /z-index:\s*var\(--pm-guide-dialog-layer\)/);
    for (const file of ['learning/CoursePractice','admin/InterviewCatalog']) {
        const page = read(`resources/js/pages/${file}.tsx`);
        assert.match(page, /from '@\/components\/ui\/dialog'/);
        assert.match(page, /<DialogContent /);
    }
    assert.doesNotMatch(css('pm-course-practice'), /\.pm-course-quiz-dialog\s*\{[^}]*z-index/);
    assert.doesNotMatch(css('pm-interview-admin'), /pm-interview-admin-modal-overlay/);
});
