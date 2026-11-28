import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const rule = (css, selector) => css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`))?.[1] ?? '';

test('contact form shortcut inherits the standard primary button geometry', () => {
    const css = read('resources/css/pm-contact.css');
    const base = rule(css, '\\.pm-contact-primary,\\.pm-contact-chat-card-link');
    assert.match(base, /min-height:var\(--control-height\)/);
    assert.match(base, /font-size:var\(--text-ui\)/);
    assert.match(base, /padding:var\(--s2\) var\(--s4\)/);
    assert.doesNotMatch(rule(css, '\\n\\.pm-contact-chat-card-link'), /min-height|font-size|padding/);
});

test('members sort retains PMDropdown and inherits standard appearance', () => {
    const page = read('resources/js/pages/members/Directory.tsx');
    const css = read('resources/css/pm-member-directory.css');
    const dropdown = read('resources/css/pm-dropdown.css');
    assert.match(page, /<PMDropdown id="members-sort"/);
    assert.match(rule(dropdown, '\\.pm-dropdown-trigger'), /min-height: var\(--control-height\)/);
    assert.match(rule(dropdown, '\\.pm-dropdown-trigger'), /border: 1px solid var\(--control-border\)/);
    assert.doesNotMatch(rule(css, '\\.pm-members-sort \\.pm-dropdown-trigger'), /min-height|border|font|background|padding/);
    assert.match(rule(css, '\\.pm-members-subheading'), /flex-wrap: wrap/);
});

test('discover uses the common rail and retains a printable reflection', () => {
    const css = read('resources/css/pm-discover.css');
    assert.match(rule(css, '\\.pm-discover-main'), /width: var\(--pm-v2-container-width\)/);
    assert.match(css, /\.pm-member-sidebar-layout \.pm-discover-main \{ width: 100%/);
    assert.match(css, /@media print/);
    assert.match(css, /\.pm-app:has\(\.pm-discover-page\) :is\([^\n]*\.pm-v2-site-footer[^\n]*\.pm-dash-sidebar/);
});

test('create event uses the shared banner for its authenticated member route', () => {
    const page = read('resources/js/pages/events/Create.tsx');
    const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
    assert.match(page, /memberBanner banner=\{\{title: 'Create event'/);
    assert.match(page, /parents: \[\{label: 'Community Events', href: '\/events'\}\]/);
    assert.match(layout, /memberBanner && banner && <PublicPageBanner/);
    assert.doesNotMatch(page, /EventBanner/);
    assert.match(page, /<EventEditor\/>/);
    assert.match(page, /<LinkedPagination links=\{submissions.links\}/);
});

test('approved four-column course grid and responsive fallbacks are preserved', () => {
    const css = read('resources/css/pm-learning-public.css');
    assert.match(rule(css, '\\.pm-learn-v3-rows'), /repeat\(4,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-rows \{ grid-template-columns: repeat\(3,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-rows, \.pm-learn-v3-sidebar \{ grid-template-columns: repeat\(2,minmax\(0,1fr\)\)/);
    assert.match(css, /\.pm-learn-v3-rows, \.pm-learn-v3-sidebar \{ grid-template-columns: minmax\(0,1fr\)/);
});
