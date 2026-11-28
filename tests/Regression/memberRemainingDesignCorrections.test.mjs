import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const js = path => read(`resources/js/${path}`);
const css = path => read(`resources/css/${path}.css`);
const settings = css('pm-dashboard-shell');
const resume = css('pm-resume-imports');
const catalog = css('pm-learning-catalog');
const rule = (source, selector) => {
    const start = source.indexOf(`${selector} {`);
    assert.ok(start >= 0, selector);
    return source.slice(start, source.indexOf('}', start));
};
test('appearance and security sections share a semantic settings heading and card', () => {
    for (const file of ['pages/settings/appearance.tsx', 'pages/settings/security.tsx', 'components/manage-two-factor.tsx', 'components/manage-passkeys.tsx']) {
        const source = js(file);
        assert.match(source, /<MemberSettingsHeading/);
        assert.match(source, /className="pm-member-settings-card"/);
        assert.doesNotMatch(source, /<Heading\b|space-y-6/);
    }
    assert.match(rule(settings, '.pm-member-settings-section-heading h2'), /var\(--text-h2\)\/var\(--line-h2\)/);
    assert.match(rule(settings, '.pm-member-settings-section-heading p, .pm-member-settings-description'), /var\(--text-body\)\/var\(--line-body\)/);
    assert.match(rule(settings, '.pm-member-settings-panels > .pm-member-settings-card'), /padding: var\(--pm-guide-card-padding\)/);
    assert.match(rule(settings, '.pm-member-settings-tabs a'), /min-height: var\(--control-height\)/);
});
test('security forms preserve their existing operations and use the common layout', () => {
    const security = js('pages/settings/security.tsx');
    assert.match(security, /SecurityController\.update\.form\(\)/);
    assert.match(security, /resetOnSuccess/);
    assert.match(security, /className="pm-member-settings-form"/);
    assert.match(js('components/manage-two-factor.tsx'), /enable\.form\(\)/);
    assert.match(js('components/manage-two-factor.tsx'), /disable\.form\(\)/);
    assert.match(js('components/passkey-register.tsx'), /await register\(name\)/);
    assert.match(js('components/manage-passkeys.tsx'), /router\.delete\(destroy\.url\(id\)/);
    assert.match(js('components/two-factor-recovery-codes.tsx'), /regenerateRecoveryCodes\.form\(\)/);
});
test('resume import section, panels and actions use central roles', () => {
    assert.match(rule(resume, '.pm-resume-heading h2'), /var\(--text-h2\)/);
    for (const selector of ['.pm-resume-panel-heading h3', '.pm-resume-review h3']) assert.match(rule(resume, selector), /var\(--text-h3\)/);
    for (const selector of ['.pm-resume-file-actions button, .pm-resume-file-actions a', '.pm-resume-full-btn', '.pm-resume-review-buttons .pm-btn', '.pm-resume-document-tools .pm-resume-file-actions a', '.pm-resume-history > button']) assert.match(rule(resume, selector), /min-height: var\(--control-height\)/);
});
test('registrants reuses the shared banner and member breadcrumb, preserving download and pagination', () => {
    const source = js('pages/events/Registrants.tsx');
    assert.doesNotMatch(source, /EventBanner/);
    assert.match(source, /memberBanner banner=\{\{/);
    assert.match(source, /currentLabel: 'Registrants'/);
    assert.match(source, /registrants\/download/);
    assert.match(source, /<LinkedPagination/);
    assert.match(js('components/dashboard/memberBreadcrumbs.ts'), /current\('Registrants'\)/);
});
test('all three legacy catalog tabs use the same tokenized spacing and card standards', () => {
    const source = js('pages/learning/Catalog.tsx');
    assert.match(source, /tab === 'paths' \|\| tab === 'practice' \|\| tab === 'exams'/);
    assert.match(source, /<LegacyCatalog/);
    assert.match(rule(catalog, '.pm-catalog-course-info'), /padding: var\(--pm-guide-card-padding\)/);
    assert.match(rule(catalog, '.pm-catalog-course-grid'), /gap: var\(--pm-guide-card-gap\)/);
    assert.match(rule(catalog, '.pm-catalog-course-title'), /font-size: var\(--text-h3\)/);
    assert.match(rule(catalog, '.pm-catalog-course-action'), /min-height: var\(--control-height\)/);
    assert.doesNotMatch(catalog.replace(/var\(--[\w-]+\)/g, "TOKEN"), /\b(?:padding|margin|gap)(?:-[a-z]+)?:[^;{}]*\b\d+px\b/);
});
