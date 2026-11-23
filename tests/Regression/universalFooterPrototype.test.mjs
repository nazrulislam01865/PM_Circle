import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('every permitted site shell renders the same approved five-column footer', () => {
    const shared = read('resources/js/components/pm/SiteFooter.tsx');
    const layout = read('resources/js/layouts/pm/PublicLayout.tsx');
    const member = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
    const auth = read('resources/js/layouts/pm/AuthPageFrame.tsx');
    const editor = read('resources/js/pages/admin/SiteFooterEditor.tsx');
    assert.match(shared, /return <HomeFooter content=\{content\}/);
    assert.doesNotMatch(shared, /return .*<PmpPublicFooter/);
    for (const source of [layout, member, auth]) assert.match(source, /<SiteFooter\b/);
    assert.match(editor, /<HomeFooter content=\{data\}\/>/);
    assert.match(shared, /shouldShowSiteFooter\(page\.url\)/);
    assert.match(shared, /page\.props\.siteFooter \?\? pmpFooterContent/);
});

test('global footer styling and responsive layout work outside homepage shell', () => {
    const styles = read('resources/css/pm-home-v2-sections.css');
    const mobile = read('resources/css/pm-home-v2-responsive.css');
    assert.match(styles, /\.pm-v2-site-footer \{[^}]*background: var\(--pm-v2-footer-bg\)/);
    assert.match(styles, /\.pm-v2-site-footer \.pm-v2-container \{[^}]*var\(--pm-guide-container\)/);
    assert.match(styles, /\.pm-home-v2-shell \.pm-v2-site-footer \.pm-v2-container \{[^}]*var\(--pm-v2-container-width\)/);
    assert.match(mobile, /\.pm-v2-site-footer \.pm-v2-container,/);
    assert.match(read('resources/css/pm-member-navigation.css'), /\.pm-member-shell > \.pm-v2-site-footer/);
    assert.match(read('resources/css/pm-member-shell.css'), /\.pm-member-shell > \.pm-v2-site-footer/);
    assert.match(read('resources/css/pm-circle.css'), /\.pm-auth-shell>\.pm-v2-site-footer/);
    assert.match(read('resources/css/pm-admin.css'), /\.pm-footer-admin-preview>\.pm-v2-site-footer/);
});

test('no footer component displays the removed prototype attribution', () => {
    for (const path of [
        'resources/js/components/home/v2/HomeFooter.tsx',
        'resources/js/components/exam/PmpPublicFooter.tsx',
        'resources/js/components/pm/SiteFooter.tsx',
    ]) {
        assert.doesNotMatch(read(path), /Homepage design mockup|Sample content/);
    }
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    for (const heading of ['Company', 'Learning', 'Community', 'Plans & Policies']) {
        assert.match(footer, new RegExp(`title="${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    }
    assert.match(footer, /© PM Circle by ITQAN/);
});
