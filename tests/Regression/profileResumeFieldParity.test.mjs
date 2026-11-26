import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const edit = read('resources/js/components/profile/ProfileEditorPrototype.tsx');
const fields = read('resources/js/components/profile/profileResumeFields.ts');
const overview = read('resources/js/components/profile/ProfileOverviewSections.tsx');
const request = read('app/Http/Requests/Settings/ProfileUpdateRequest.php');
const projection = read('app/Domain/Identity/Services/MemberProfileOverview.php');
const document = read('app/Domain/Identity/Services/ResumeDocument.php');
const assistant = read('resources/js/pages/account/ResumeAssistant.tsx');
const jump = read('resources/js/components/profile/ProfileSectionJump.tsx');
const css = read('resources/css/pm-profile-editor-prototype.css');

test('new résumé-shaped fields use the same editable and read-only profile record schema', () => {
    for (const key of ['research', 'skill_groups', 'interests']) {
        assert.match(fields, new RegExp(`${key}: \\{ title:`));
        assert.match(fields, new RegExp(`${key}: persisted\\.${key} \\?\\? \\[\\]`));
        assert.match(overview, new RegExp(`key: '${key}'`));
        assert.match(request, new RegExp(`'${key}' => \\[`));
        assert.match(projection, new RegExp(`'${key}' => \\[`));
    }
    for (const field of ['technical', 'soft', 'team', 'courses', 'portfolio', 'github']) {
        for (const source of [fields + read('resources/js/components/profile/resumeFieldSchema.ts'), projection, document]) assert.ok(source.includes(`'${field}'`), field);
        assert.ok(request.includes(`'${field}'`) || request.includes(`'editor_details.${field}'`), field);
    }
    assert.match(overview, /alignedDefinitions/);
    assert.match(overview, /initialRecords\(profile\)/);
});
test('existing saved private CV is not written by profile editing and new sections default private', () => {
    const save = read('app/Domain/Identity/Services/ProfileEditorSaveService.php');
    assert.doesNotMatch(save, /private_resume_document/);
    assert.match(save, /array_replace\(\$previous\['records'\] \?\? \[\], \$details\['records'\]\)/);
    assert.match(read('app/Domain/Identity/Services/ProfileFieldPrivacy.php'), /'research_work' => 'private', 'interests' => 'private'/);
    assert.match(projection, /\$includeSections && \$can\(\$privacy\)/);
});
test('both workspaces reuse one token-based jump panel with actual scroll offsets', () => {
    assert.match(edit, /<ProfileSectionJump sections={navigation} targetPrefix="editor-"/);
    assert.match(assistant, /<ProfileSectionJump sections={jumpSections} targetPrefix="resume-"/);
    assert.match(jump, /scrollIntoView/);
    assert.match(jump, /prefers-reduced-motion/);
    assert.match(jump, /scrollMarginTop/);
    assert.match(jump, /<progress aria-label="Profile completion"/);
    assert.match(css, /\.pm-profile-section-jump-nav\s*\{\s*display: flex; flex-wrap: wrap/);
    assert.match(css, /font: var\(--pm-guide-weight-control\) var\(--text-sm\)\/var\(--line-ui\) var\(--font-ui\)/);
});
