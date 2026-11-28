import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('home page, other public pages, member pages, auth pages and admin preview share one footer renderer', () => {
    const canonical = read('resources/js/components/home/v2/HomeFooter.tsx');
    const site = read('resources/js/components/pm/SiteFooter.tsx');
    const legacy = read('resources/js/components/exam/PmpPublicFooter.tsx');
    const admin = read('resources/js/pages/admin/SiteFooterEditor.tsx');
    assert.match(site, /<HomeFooter content=\{content\}/);
    assert.match(site, /page\.props\.siteFooter \?\? pmpFooterContent/);
    assert.match(legacy, /return <HomeFooter content=\{content\}\/>/);
    assert.doesNotMatch(legacy, /pm-unified-footer-(dark|compact)/);
    assert.match(admin, /<HomeFooter content=\{data\}/);
    assert.match(canonical, /<footer className="pm-v2-site-footer"/);
    for (const file of [
      'resources/js/layouts/pm/PublicLayout.tsx',
      'resources/js/layouts/pm/MemberDashboardLayout.tsx',
      'resources/js/layouts/pm/AuthPageFrame.tsx',
    ]) assert.match(read(file), /<SiteFooter\b/, file);
    const discover = read('resources/js/components/discover-pm/DiscoverShell.tsx');
    assert.match(discover, /<PublicLayout\b/);
    assert.doesNotMatch(discover, /<SiteFooter\b/);
});

test('footer has one set of prototype labels with no old mockup copy', () => {
    const home = read('resources/js/components/home/v2/HomeFooter.tsx');
    for (const title of ['Company', 'Learning', 'Community', 'Plans & Policies']) {
      assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes(`'title' => '${title}'`));
    }
    assert.doesNotMatch(home, /pm-v2-footer-payments/);
    assert.match(read('app/Support/Admin/SiteFooterContent.php'), /Learn project management, practise for certification, and connect with peers\./);
    assert.match(home, /content\.description/);
    assert.match(home, /columns\.map/);
    assert.doesNotMatch(home, /Homepage design mockup|Sample content/);
});

test('footer styles are independent of old footer and align with page content rails', () => {
    const css = read('resources/css/pm-home-v2-sections.css');
    assert.match(css, /\.pm-v2-site-footer \{[^}]*background: var\(--pm-v2-footer-bg\)/);
    assert.match(css, /\.pm-events-shell \.pm-v2-site-footer \.pm-v2-container/);
    assert.match(css, /\.pm-home-v2-shell \.pm-v2-site-footer \.pm-v2-container/);
    assert.match(css, /\.pm-v2-footer-grid \{[^}]*grid-template-columns: var\(--pm-footer-desktop-columns, 1\.45fr repeat\(4/);
    assert.match(read('resources/css/pm-design-tokens.css'), /--pm-guide-footer: #0d223d;/);
    assert.match(read('resources/css/pm-learning-public.css'), /\.pm-learn-v3-wrap\s*\{\s*width: var\(--pm-v2-container-width\)/);
});
