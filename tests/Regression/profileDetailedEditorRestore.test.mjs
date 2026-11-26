import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/settings/profile.tsx');
const editor = read('resources/js/components/profile/ProfileEditorPrototype.tsx');

test('old detailed editor is the direct edit tab, without the compact mode wrapper', () => {
    assert.match(page, /currentTab === 'edit' && \(\s*<ProfileEditorPrototype/);
    assert.doesNotMatch(page, /CompactProfileEditor/);
    assert.match(page, /onCancel=\{\(\) => changeTab\('overview'\)\}/);
});
test('restored editor preserves later import visibility and record refresh fixes', () => {
    assert.match(page, /onImport=\{profileResumeImportsVisible \? \(\) => changeTab\('imports'\) : undefined\}/);
    assert.match(editor, /\{onImport && <section className="pm-card pm-prototype-section pm-prototype-simple">/);
    assert.match(editor, /if \(updated\) \{ setRecords\(alignedRecords\(updated\)\); setBasic\(alignedBasic\(updated\)\); \}/);
    assert.match(editor, /setRemoved\(\{\}\)/);
});
test('compact-only saved data remains preserved during detailed edits', () => {
    const service = read('app/Domain/Identity/Services/ProfileEditorSaveService.php');
    assert.match(service, /\$details = array_replace\(\$previous, \$data\['editor_details'\]\)/);
    assert.match(read('config/pm-circle.php'), /'profile_resume_imports_visible' => false,/);
});
