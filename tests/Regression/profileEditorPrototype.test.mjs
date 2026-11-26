import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resumeSectionNavigation, resumeBasicFields, resumeSections } from '../../resources/js/components/profile/resumeFieldSchema.ts';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const ui = read('resources/js/components/profile/ProfileEditorPrototype.tsx');
const page = read('resources/js/pages/settings/profile.tsx');
const css = read('resources/css/pm-profile-editor-prototype.css');
const controller = read('app/Http/Controllers/Settings/ProfileController.php');
const service = read('app/Domain/Identity/Services/ProfileEditorSaveService.php');
const request = read('app/Http/Requests/Settings/ProfileUpdateRequest.php');
const migration = read('database/migrations/2026_11_18_000010_add_editor_details_to_profiles.php');

test('profile editor follows the exact shared résumé section order', () => {
  assert.deepEqual(resumeSectionNavigation.map(x => x.label), [
    'Basic details','Personal Profile','Education','Work Experience','Research Work','Projects','Skills','Achievements','Interests','Languages','Certifications',
  ]);
  const fields = read('resources/js/components/profile/profileResumeFields.ts');
  assert.match(fields, /navigation = resumeSectionNavigation.map/);
  assert.match(ui, /alignedCollections.map\(type => <EditorCollection/);
  assert.doesNotMatch(ui, /id="editor-(contact|about|career)"/);
});

test('one reusable field and record editor uses the actual résumé schema', () => {
  assert.deepEqual(resumeBasicFields.map(x=>x[1]), ['Full name','Email','Current role','Location','Professional headline','Phone','Portfolio URL or label','GitHub username or URL','LinkedIn username or URL']);
  assert.deepEqual(resumeSections.find(x=>x.id==='experience').fields.map(x=>x[1]), ['Company','Location','Job title','Employment period','Responsibilities and achievements','Technical skills','Soft skills']);
  const fields = read('resources/js/components/profile/profileResumeFields.ts');
  assert.match(fields, /section.fields.map/);
  assert.match(ui, /const definition = alignedDefinitions\[type\]/);
  assert.match(ui, /function ProfileInput\(/);
  assert.match(ui, /function EditorCollection\(/);
  assert.match(ui, /disabled=\{saving\}/);
  assert.match(ui, /onError: next =>/);
  assert.match(ui, /aria-invalid=\{Boolean\(error\)\}/);
});

test('reuse page header, tabs, layout and existing import/privacy modules', () => {
  assert.match(page, /<ProfileEditorPrototype/);
  assert.match(page, /<MemberDashboardLayout/);
  assert.match(page, /<ResumeImportsTab/);
  assert.match(page, /<ProfilePrivacyTab/);
  assert.match(page, /<ProfileWorkspaceHeader/);
  assert.match(read('resources/js/components/profile/ProfileWorkspaceHeader.tsx'), /pm-profile-nav-tabs pm-member-tertiary-sticky/);
});

test('styles use centralized design tokens and stay scoped to the edit tab', () => {
  assert.match(css, /\.pm-profile-page--editor/);
  assert.match(ui, /pm-prototype-main pm-profile-editor-card/);
  assert.doesNotMatch(ui, /pm-prototype-help/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /font-family:\s*["']/);
});

test('profile editing aligns with the shared member width and canonical control tokens', () => {
  const profileCss = read('resources/css/pm-profile.css');
  const memberCss = read('resources/css/pm-member-shell.css');
  const tokens = read('resources/css/pm-design-tokens.css');
  assert.match(profileCss, /max-width: var\(--pm-member-page-max-width\)/);
  assert.match(memberCss, /\.pm-member-shell \.pm-dash-body\s*\{/);
  assert.match(memberCss, /width: min\(var\(--pm-member-page-max-width\), calc\(100% - 64px\)\)/);
  assert.doesNotMatch(css, /max-width: 1276px/);
  assert.match(css, /border-color: var\(--control-border\)/);
  assert.match(tokens, /--control-border:\s*var\(--pm-guide-control-line\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test('all repeatable sections use the same prototype card shell and safe inputs', () => {
  assert.match(ui, /className="pm-card pm-prototype-section pm-prototype-collection"/);
  assert.match(ui, /required={field.required} disabled={disabled}/);
  assert.match(ui, /resumeBasicFields.map\(\(\[key,label\]\) => rootField/);
  assert.match(ui, /key === 'email' \? 'email' : key === 'phone' \? 'tel'/);
  assert.match(ui, /firstKey\?\.startsWith\('skills\.'\)/);
  assert.match(css, /--pm-editor-sticky-offset:/);
  assert.match(css, /scroll-margin-top: var\(--pm-editor-sticky-offset\)/);
});

test('save is authenticated, validated, owned and atomic without additional read requests', () => {
  assert.match(controller, /'editor_details' => in_array\(\$activeTab, \['edit', 'overview'\], true\)/);
  assert.match(controller, /ProfileEditorSaveService::class/);
  assert.match(request, /private function editorRules\(\)/);
  assert.match(request, /'url:https'/);
  assert.match(service, /DB::transaction/);
  assert.match(service, /abort_unless\(\$existing->has\(\$id\)/);
  assert.match(migration, /\$table->json\('editor_details'\)/);
});

test('clicking anywhere on profile month fields opens the existing native calendar', () => {
  const sharedDate = read('resources/js/components/profile/ProfileDateInput.tsx');
  assert.match(ui, /type=\{field\.type === 'month' \? 'month'/);
  assert.match(ui, /onClick=\{field\.type === 'month' \? event => \{/);
  assert.match(ui, /event\.currentTarget\.showPicker\?\.\(\)/);
  assert.match(sharedDate, /event\.currentTarget\.showPicker\?\.\(\)/);
  assert.match(css, /input\[type="month"\]:not\(:disabled\) \{ cursor: pointer; \}/);
});
