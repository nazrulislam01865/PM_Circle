import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const css = read('resources/css/pm-member-sidebar-restore.css');
const member = read('resources/js/layouts/pm/MemberDashboardLayout.tsx');
const publicLayout = read('resources/js/layouts/pm/PublicLayout.tsx');
const footer = read('resources/js/components/pm/SiteFooter.tsx');
const appCss = read('resources/css/app.css');

test('member footer follows the entire sidebar and workspace at full page width', () => {
    assert.match(member, /<div className="pm-member-content-frame">[\s\S]*<DashboardSidebar dashboard=\{dashboard\}/);
    assert.match(member, /<\/div>\s*<SiteFooter \/>/, 'Footer must be outside the sidebar/content wrapper');
    assert.match(css, /\.pm-app\.pm-member-sidebar-layout\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s);
    assert.match(css, /\.pm-member-sidebar-layout > \.pm-member-content-frame\s*\{[^}]*display:\s*grid;/s);
    assert.match(css, /\.pm-member-content-frame > \.pm-dash-sidebar\s*\{[^}]*grid-row:\s*1 \/ 3;/s);
    assert.match(css, /\.pm-member-content-frame > \.pm-member-restored-sidebar\s*\{[^}]*height:\s*max-content;/s);
    assert.match(css, /\.pm-member-sidebar-layout > \.pm-v2-site-footer\s*\{[^}]*width:\s*100%;/s);
    assert.match(css, /\.pm-member-sidebar-layout \.pm-dash-sidebar-links\s*\{[^}]*overflow:\s*visible;/s);
    assert.match(css, /@media \(max-width: 960px\)[\s\S]*\.pm-member-content-frame > \.pm-member-restored-sidebar\s*\{[^}]*position:\s*fixed;/s);
});

test('member screens and public-style routes align content within the same responsive rail', () => {
    assert.match(css, /\.pm-app\.pm-member-sidebar-layout:not\(\.pm-member-full-width\) \.pm-dash-body\s*\{[^}]*width:\s*min\(var\(--pm-v2-container-width\),/s);
    assert.match(css, /\.pm-member-sidebar-layout\.pm-member-full-width \.pm-member-public-content > \.pm-container\s*\{[^}]*margin-inline:\s*auto\s*;/s);
    assert.match(css, /@media \(max-width: 1050px\)[\s\S]*--pm-v2-container-width:\s*min\(90vw,/);
    assert.match(css, /@media \(max-width: 700px\)[\s\S]*--pm-v2-container-width:\s*calc\(100% - 2 \* var\(--s4\)\)/);
    assert.match(publicLayout, /<MemberDashboardLayout dashboard=\{memberShell\}/);
});

test('the approved public/footer components and guest styles are reused without changes', () => {
    assert.match(member, /<DashboardSidebar dashboard=\{dashboard\}/);
    assert.match(member, /<SiteFooter \/>/);
    assert.match(footer, /<HomeFooter content=\{content\}/);
    assert.match(appCss, /@import '\.\/pm-member-sidebar-restore\.css';/);
    assert.match(appCss, /@import '\.\/pm-public-layout-consistency\.css';/);
});
