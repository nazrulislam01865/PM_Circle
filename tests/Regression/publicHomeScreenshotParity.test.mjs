import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('footer starts with the approved prototype columns but renders the saved groups', () => {
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    const defaults = read('app/Support/Admin/SiteFooterContent.php');
    const layout = read('resources/css/pm-home-v2-sections.css');
    for (const title of ['Company','Learning','Community','Plans & Policies']) assert.ok(defaults.includes(`'title' => '${title}'`));
    assert.match(footer, /content\.columns\.filter/);
    assert.match(footer, /column\.visible && column\.links\.length/);
    assert.match(footer, /columns\.map/);
    assert.match(footer, /title=\{column.title\} items=\{column.links\}/);
    assert.doesNotMatch(footer, /prototypeLink|uniqueLinks|title="Company"/);
    assert.match(layout, /grid-template-columns: var\(--pm-footer-desktop-columns, 1\.45fr repeat\(4/);
});

test('footer social icons stay horizontal, round and homepage-ordered in the canonical footer', () => {
    const layout = read('resources/css/pm-home-v2-sections.css');
    const social = read('resources/js/components/pm/FooterIdentity.tsx');
    const homeFooter = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.match(layout, /\.pm-v2-footer-grid > nav \{[^}]*flex-direction: column/);
    assert.match(layout, /\.pm-v2-footer-identity \.pm-unified-footer-social \{[^}]*flex-direction: row/);
    assert.match(layout, /\.pm-v2-footer-identity \.pm-unified-footer-social a \{[^}]*border-radius: 50%/);
    assert.match(social, /content\.socials\.filter/);
    assert.match(social, /active\.map/);
    assert.match(homeFooter, /<FooterSocial content=\{content\} compact\/>/);
});

test('community cards retain live content but match prototype typography, height and fallback icon appearance', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    const styles = read('resources/css/pm-home-v2-sections.css');
    const component = read('resources/js/components/home/v2/HomeCommunity.tsx');
    const picker = read('resources/js/components/home/HomeEngagement.tsx');
    assert.match(tokens, /--pm-v2-font-body: var\(--pm-guide-text-body\)/);
    assert.match(tokens, /--pm-v2-font-ui: var\(--pm-guide-text-control\)/);
    assert.match(styles, /\.pm-v2-scenario-card \{[^}]*min-height: 314px/);
    assert.match(styles, /\.pm-v2-scenario-card \.pm-v2-post-content > p \{[^}]*-webkit-line-clamp: 2/);
    assert.match(component, /scenario\?\.title/);
    assert.match(component, /scenario\?\.summary/);
    assert.match(component, /<span className="pm-v2-official-avatar"/);
    assert.match(picker, /prototypeLikeIcon && type === 'like' \? Heart/);
    assert.match(picker, /url && failedUrl !== url/);
});
