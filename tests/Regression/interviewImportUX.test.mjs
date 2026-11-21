import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/admin/InterviewCatalog.tsx');
const css = read('resources/css/pm-interview-admin.css');

test('interview import preserves set selection, template and current upload endpoint', () => {
    assert.match(page, /id="interview-import-set" contentClassName="pm-interview-admin-choice-content"/);
    assert.match(page, /router\.post\(`\$\{base\}\/questions\/import`, \{ set_id: Number\(importSet\), file: importFile \}/);
    assert.match(page, /forceFormData: true/);
    assert.match(page, /href=\{`\$\{base\}\/questions\/template`\} download/);
});

test('file picker shows selection, supports drag-and-drop and can clear a file', () => {
    assert.match(page, /htmlFor="interview-import-file"/);
    assert.match(page, /id="interview-import-file" type="file"/);
    assert.match(page, /onDrop=\{event =>/);
    assert.match(page, /onChange=\{event => \{ chooseImportFile/);
    assert.match(page, /importFile\.name/);
    assert.match(page, /chooseImportFile\(null\)/);
    assert.match(page, /disabled=\{busy \|\| !importFile \|\| !importSet\}/);
    assert.match(page, /importErrors\.file && <p/);
});

test('client checks file extension, non-empty size, and 5MB limit; server validation remains', () => {
    assert.match(page, /\/\\\.\(csv\|xlsx\)\$\/i\.test\(file\.name\)/);
    assert.match(page, /file\.size === 0 \|\| file\.size > 5 \* 1024 \* 1024/);
    assert.match(page, /router\.post\(`\$\{base\}\/questions\/import`/);
});

test('import UI uses centralized tokens and keyboard-accessible file input', () => {
    assert.match(css, /\.pm-interview-import-input:focus-visible\+\.pm-interview-import-dropzone/);
    assert.match(css, /font:\s*var\(--regular\).*var\(--font-ui\)/);
    assert.match(css, /\.pm-interview-import-template-row/);
    assert.doesNotMatch(page, /<label className="pm-admin-field"><span>Question file/);
});
