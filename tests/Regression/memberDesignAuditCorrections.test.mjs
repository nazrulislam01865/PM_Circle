import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = file => read(`resources/css/${file}.css`);
const page = file => read(`resources/js/pages/${file}.tsx`);
const component = file => read(`resources/js/components/${file}.tsx`);

test('starting-point screens have no fixed inline geometry and share token-driven cards', () => {
    const check = page('learning/SkillsCheck');
    const result = page('learning/StartingPointResult');
    assert.equal((check.match(/style=\{\{/g) || []).length, 1);
    assert.match(check, /style=\{\{ width: `\$\{progressPercent\}%` \}\}/);
    assert.doesNotMatch(result, /style=\{\{/);
    for (const source of [check, result]) {
        assert.match(source, /pm-container pm-page pm-starting-point/);
        assert.match(source, /pm-panel pm-sp-card/);
    }
    assert.match(css('pm-learning'), /pm-learning-starting-point\.css/);
    const styles = css('pm-learning-starting-point');
    assert.match(styles, /\.pm-sp-card \{[^}]*padding: var\(--pm-guide-card-padding\)[^}]*border-radius: var\(--radius-card\)/);
    assert.match(styles, /\.pm-sp-section-title \{[^}]*var\(--text-h2\)\/var\(--line-h2\)/);
    assert.match(styles, /@container \(max-width: 48rem\)[^\n]*grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(check, /aria-pressed=\{isChosen\}/);
    assert.match(check, /disabled=\{!isAnswered\}/);
    assert.match(check, /aria-valuenow=\{progressPercent\}/);
});

test('appearance controls retain all three modes using shared semantic button states', () => {
    const source = component('appearance-tabs');
    assert.doesNotMatch(source, /(?:bg|text)-neutral-/);
    for (const mode of ['light', 'dark', 'system']) assert.match(source, new RegExp(`value: '${mode}'`));
    assert.match(source, /onClick=\{\(\) => updateAppearance\(value\)\}/);
    assert.match(source, /aria-pressed=\{appearance === value\}/);
    assert.match(css('pm-dashboard-shell'), /\.pm-appearance-option \{[^}]*min-height: var\(--control-height\)/);
});

test('security and the two-factor modal retain shared semantic validation by default', () => {
    const input = component('input-error');
    assert.match(input, /className=\{cn\('pm-validation-error', className\)\}/);
    assert.doesNotMatch(input, /text-red-|semantic =/);
    for (const source of [page('settings/security'), component('two-factor-setup-modal')]) {
        const tags = source.match(/<InputError\b[^>]*>/g) || [];
        assert.ok(tags.length);
        assert.ok(tags.every(tag => !/\bsemantic\b/.test(tag)));
    }
    assert.match(css('pm-circle'), /\.pm-validation-error \{ color: var\(--red\)/);
});

test('membership import dialog always uses approved roles, even without stored content', () => {
    assert.match(page('billing/Membership'), /plans=\{plans\} content=\{content\} memberView/);
    const source = component('billing/PricingComparisonContent');
    assert.match(source, /content \|\| memberView \? 'pm-public-compare-dialog'/);
    assert.match(source, /content \|\| memberView \? 'pm-compare-dialog-body'/);
    assert.match(css('pm-comparison'), /\.pm-compare-dialog-body \{[^}]*var\(--pm-guide-text-body\)/);
});

test('account settings descriptions use body role without increasing control labels or errors', () => {
    const source = css('pm-account-settings');
    for (const selector of ['pm-settings-banner', 'pm-settings-intro p', 'pm-settings-copy p', 'pm-settings-balance p']) {
        assert.match(source, new RegExp(`\\.${selector} \\{[^}]*font-size: var\\(--text-body\\)`));
    }
    assert.match(source, /\.pm-settings-error \{[^}]*font-size: var\(--text-ui\)/);
    assert.match(source, /data-text-size=large\] \.pm-settings-copy p \{ font-size: var\(--pm-guide-text-lead\)/);
});

test('legacy member learning tabs use shared sort, search and display controls', () => {
    const source = page('learning/Catalog');
    assert.match(source, /pm-course-catalog pm-member-legacy-catalog/);
    assert.match(source, /<PMDropdown id="pm-legacy-learning-sort"[^>]*required/);
    assert.doesNotMatch(source, /<select value=\{sort\}/);
    assert.match(source, /className="pm-input" type="search"/);
    assert.match(source, /onClick=\{\(\) => setDisplay\('list'\)\}/);
    assert.match(source, /checked=\{selected\[key\]\.includes\(option\)\}/);
    assert.match(source, /legacyTab \? <LegacyCatalog[^>]*\/> : <PublicCourseCatalog/);
    assert.match(css('pm-learning-catalog'), /\.pm-member-legacy-catalog \.pm-catalog-view-switch \.pm-button \{[^}]*min-height: var\(--control-height\)/);
});

test('profile views use the section heading role only on Profile Insights', () => {
    assert.match(page('account/Insights'), /className="pm-profile-insights-page"/);
    assert.match(css('pm-member-pages'), /\.pm-profile-insights-page \.pm-feature-section h2 \{\s*font: var\(--pm-guide-weight-h2\) var\(--text-h2\)\/var\(--line-h2\)/);
});

test('achievements distinguish section headings and card headings without changing profile badges', () => {
    const source = css('pm-achievements');
    assert.match(source, /\.pm-ach-workspace \.pm-ach-panel h2[^{}]*\{ font-size: var\(--text-h2\); line-height: var\(--line-h2\)/);
    assert.match(source, /\.pm-ach-workspace \.pm-ach-panel h3[^{}]*\{ font: var\(--bold\) var\(--text-h3\)\/var\(--line-h3\)/);
    assert.match(source, /\.pm-ach-panel h2 \{ font-size: var\(--text-h3\)/);
});
