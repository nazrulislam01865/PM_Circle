import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('account workspace uses appropriate shared heading, body, control and metadata roles', () => {
    const css = read('resources/css/pm-account-workspace.css');
    assert.match(css, /h1 \{ font: var\(--pm-guide-static-h1-weight\) var\(--text-h1\)\/var\(--line-h1\)/);
    assert.match(css, /\.pm-account-card-title \{ font: var\(--bold\) var\(--text-h3\)\/var\(--line-h3\)/);
    assert.match(css, /\.pm-account-link \{[^}]+var\(--pm-guide-text-control\)\/var\(--pm-guide-line-control\)/);
    assert.match(css, /\.pm-account-meta \{ font-size: var\(--pm-guide-text-meta\)/);
    assert.match(css, /@container pm-account \(max-width: 53\.125rem\)/);
    assert.match(css, /@container pm-account \(max-width: 33\.75rem\)/);
    assert.doesNotMatch(css, /font-size:\s*(?:\d|clamp\()|#[\da-f]{3,8}\b/i);
});

test('help search, guide navigation and support actions use shared components and accessible states', () => {
    const page = read('resources/js/pages/support/HelpCentre.tsx');
    assert.match(page, /<FormField label="Search for help" htmlFor="help-search">/);
    assert.match(page, /role="status" aria-live="polite"/);
    assert.match(page, /Clear search/);
    assert.match(page, /pm-account-quick-answer/);
    assert.match(page, /pm-account-step-number/);
    assert.match(page, /className="pm-button pm-button-outline" href="\/help-center\/requests"/);
    assert.match(page, /searchHelpGuides\(query\)/);
});

test('plan usage and support uploads use a centrally styled native progress indicator', () => {
    const css = read('resources/css/pm-ui-guideline.css');
    assert.match(css, /\.pm-progress::-webkit-progress-value \{ background: var\(--blue\)/);
    assert.match(css, /\.pm-progress::-moz-progress-bar \{ background: var\(--blue\)/);
    assert.match(css, /\.pm-progress::-webkit-progress-bar \{ background: var\(--track\)/);
    assert.match(read('resources/js/components/pm/ProgressBar.tsx'), /<progress className="pm-progress" aria-label=\{label\}/);
    for (const path of ['resources/js/pages/billing/PlanUsage.tsx', 'resources/js/pages/support/ContactSupport.tsx']) {
        assert.match(read(path), /<ProgressBar label=/);
        assert.doesNotMatch(read(path), /<progress\b/);
    }
    assert.match(read('resources/js/pages/billing/PlanUsage.tsx'), /scope="col" className="pm-account-number"/);
});


test('member help pages share the full member content rail in every support view', () => {
    const page = read('resources/js/components/account/AccountPage.tsx');
    assert.match(page, /<MemberDashboardLayout dashboard=\{memberShell\}>/);
    const css = read('resources/css/pm-account-workspace.css');
    assert.match(css, /\.pm-account-page \{[^}]*width: 100%/);
    for (const file of ['HelpCentre', 'ContactSupport', 'Requests', 'RequestDetails']) {
        const view = read(`resources/js/pages/support/${file}.tsx`);
        assert.match(view, /<AccountPage\b/);
        assert.doesNotMatch(view, /pm-account-reading|max-width|min-width|<MemberDashboardLayout/);
        if (file !== 'HelpCentre') assert.doesNotMatch(view, /<PublicLayout/);
        else assert.match(view, /if \(!publicView\) return <AccountPage/);
    }
    const help = read('resources/js/pages/support/HelpCentre.tsx');
    assert.match(help, /<article className="pm-account-card">/);
    assert.match(help, /<section className="pm-account-card">\s*<h2 className="pm-account-card-title">Related guides/);
    assert.match(help, /<SupportPanel publicView=\{publicView\}\/>/);
    const shell = read('resources/css/pm-member-sidebar-restore.css');
    assert.match(shell, /\.pm-app\.pm-member-sidebar-layout:not\(\.pm-member-full-width\) \.pm-dash-body \{\s*width: min\(var\(--pm-v2-container-width\)/);
});
