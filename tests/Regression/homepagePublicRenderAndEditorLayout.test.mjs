import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('the homepage opportunities card imports the icon it renders', () => {
    const career = read('resources/js/components/home/CareerHighlights.tsx');
    assert.match(career, /import\s*\{[^}]*\bFileText\b[^}]*\}\s*from\s*['"]lucide-react['"]/s);
    assert.match(career, /<FileText\s+size=\{50\}/);
    assert.match(read('resources/js/pages/public/Home.tsx'), /<HomeResume\b/);
    assert.match(read('resources/js/components/home/v2/HomeAiResume.tsx'), /<FileText\b/);
});

test('homepage editor fields are stacked in a scoped layout without changing other admin forms', () => {
    const editor = read('resources/js/pages/admin/Homepage.tsx');
    const css = read('resources/css/pm-admin.css');
    assert.match(editor, /className="pm-admin-panel pm-admin-editor-main pm-admin-home-editor"/);
    assert.match(css, /\.pm-admin-home-editor \.pm-admin-field-grid,[\s\S]*?\.pm-admin-home-editor \.pm-admin-button-pair\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
    assert.match(css, /\.pm-admin-home-editor \.pm-admin-form-content\s*\{\s*width:\s*100%;\s*min-width:\s*0;/);
    assert.doesNotMatch(css, /width:\s*min\(100%,\s*54rem\)/);
});

test('homepage routes have a single visible input and optional suggested-page control', () => {
    const field = read('resources/js/components/admin/HomepageFields.tsx');
    assert.match(field, /type === 'route'/);
    assert.match(field, /<input id=\{id\} value=\{value\} placeholder="Enter a same-site path/);
    assert.match(field, /<details className="pm-admin-route-chooser">/);
    assert.match(field, /<summary>Choose a suggested page<\/summary>/);
    assert.match(field, /onValueChange=\{onChange\} options=\{choices \?\? \[\]\}/);
});
