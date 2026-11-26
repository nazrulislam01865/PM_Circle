import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { resumeSections, resumeRewriteLabel, resumeRewriteSections } from '../../resources/js/components/profile/resumeFieldSchema.ts';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const edit = read('resources/js/components/profile/ProfileEditorPrototype.tsx');
const assistant = read('resources/js/pages/account/ResumeAssistant.tsx');
const css = read('resources/css/pm-profile-editor-prototype.css');
const resumeCss = read('resources/css/pm-resume-assistant.css');
const review = read('resources/js/components/profile/ResumeAiReview.tsx');
const context = read('app/Domain/AI/Services/AiSubjectContext.php');

test('profile tabs remain visible but non-sticky in both editors; section jump is sticky', () => {
    const header = read('resources/js/components/profile/ProfileWorkspaceHeader.tsx');
    assert.match(header, /const isEditor = tab === 'edit' \|\| tab === 'assistant'/);
    assert.match(header, /<nav className=\{isEditor \? 'pm-profile-nav-tabs' : 'pm-profile-nav-tabs pm-member-tertiary-sticky'\}/);
    assert.doesNotMatch(header, /\{!isEditor && <nav/);
    assert.doesNotMatch(header, /\{isEditor && <button/);
    for (const label of ['Overview', 'Edit profile', 'AI Resume Assistant', 'Privacy']) assert.ok(header.includes(`label: '${label}'`));
    const jump = read('resources/js/components/profile/ProfileSectionJump.tsx');
    assert.match(jump, /pm-profile-section-jump pm-member-tertiary-sticky/);
    assert.match(jump, /ResizeObserver\(measure\)/);
    assert.match(jump, /--pm-profile-section-nav-height/);
    assert.match(css, /--pm-profile-editor-offset: calc\(/);
    assert.match(resumeCss, /--pm-resume-rail-top: var\(--pm-profile-editor-offset\)/);
});
test('both editor action bars are last children inside their respective form cards', () => {
    assert.match(edit, /pm-prototype-main pm-profile-editor-card[\s\S]*pm-profile-editor-actions pm-prototype-save/);
    assert.doesNotMatch(edit, /pm-prototype-help|<h3 className="pm-card-title">(?:Required fields|Profile visibility)/);
    const main = assistant.split('<div className="pm-resume-builder-card pm-resume-editor">')[1].split('<aside')[0];
    assert.match(main, /pm-resume-editor-footer pm-profile-editor-actions/);
    assert.match(main, /onClick=\{\(\)=>router.visit\('\/settings\/profile\?tab=overview'\)\}>Cancel/);
    assert.match(main, /save\('draft'\)/);
    assert.match(main, /setSubmitConfirm\(true\)/);
    assert.match(css, /\.pm-profile-editor-actions \{\s*position: sticky; bottom: 0;/);
    assert.match(resumeCss, /\.pm-resume-builder-card.pm-resume-editor \{ overflow: visible; \}/);
});
test('every current textarea has an explicit server-approved rewrite target', () => {
    const labels = [];
    for (const section of resumeSections) for (const [field] of section.fields) {
        if (field !== 'description' && field !== 'courses') continue;
        const label = resumeRewriteLabel(section.id, field);
        assert.ok(label, `${section.id}.${field}`);
        labels.push(label);
    }
    assert.equal(labels.length, 9);
    assert.equal(new Set(labels).size, labels.length);
    for (const label of ['Professional summary', ...labels]) assert.ok(context.includes(`'${label}'`), label);
    assert.equal(resumeRewriteLabel('achievements', 'description'), undefined);
    assert.equal(Object.keys(resumeRewriteSections).length, 8);
});
test('AI suggestions are field-specific and require user confirmation, consent and the existing gateway', () => {
    const fields = read('resources/js/components/profile/ResumeDocumentFields.tsx');
    assert.match(fields, /onSuggest\(index, key as ResumeLongField, rewriteLabel, row\[key\]/);
    assert.match(fields, /trim\(\).length < 2/);
    assert.match(assistant, /draftOnly currentDraft=\{aiSection.text\}/);
    assert.match(assistant, /i===target.index \? \{\.\.\.row,\[target.field\]:text.slice\(0,4000\)\} : row/);
    assert.match(assistant, /onSuggestion=\{text=>applySuggestion\(aiSection,text\)\}/);
    assert.doesNotMatch(assistant, /experience\.slice\(0,1\)/);
    assert.match(review, /draftOnly\?\[\]:resumes.map/);
    assert.match(review, /!consent/);
    assert.match(review, /accepted_max_credits:selected\.credits/);
    assert.match(review, /Use suggestion in draft/);
});
