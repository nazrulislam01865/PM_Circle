import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('home footer keeps five admin-aware columns without inventing routes or duplicating support/legal links', () => {
    const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
    const layout = read('resources/css/pm-home-v2-sections.css');
    assert.match(footer, /const companyLinks: LinkData\[\]/);
    assert.match(footer, /href: '\/about'/);
    assert.match(footer, /href: '\/contact'/);
    assert.match(footer, /href: '\/help-center'/);
    assert.match(footer, /content\.show_explore === false && content\.show_support === false/);
    assert.match(footer, /uniqueLinks\(/);
    assert.match(footer, /content\.explore_heading && content\.explore_heading !== 'Explore'/);
    assert.match(footer, /<FooterLinks title="Learning"/);
    assert.match(footer, /<FooterLinks title="Community"/);
    assert.match(footer, /<FooterLinks title="Plans & Policies"/);
    assert.match(layout, /grid-template-columns: 1\.45fr repeat\(4, minmax\(0, 1fr\)\)/);
});

test('footer social icons stay horizontal, round and homepage-ordered without changing other footers', () => {
    const layout = read('resources/css/pm-home-v2-sections.css');
    const social = read('resources/js/components/exam/PmpPublicFooter.tsx');
    const homeFooter = read('resources/js/components/home/v2/HomeFooter.tsx');
    assert.match(layout, /\.pm-v2-footer-grid > nav \{[^}]*flex-direction: column/);
    assert.match(layout, /\.pm-v2-footer-identity \.pm-unified-footer-social \{[^}]*flex-direction: row/);
    assert.match(layout, /\.pm-v2-footer-identity \.pm-unified-footer-social a \{[^}]*border-radius: 50%/);
    assert.match(social, /prototypeSocialNetworks/);
    assert.match(social, /prototypeOrder = false/);
    assert.match(homeFooter, /<FooterSocial content=\{content\} compact prototypeOrder\/>/);
});

test('community cards retain live content but match prototype typography, height and fallback icon appearance', () => {
    const tokens = read('resources/css/pm-design-tokens.css');
    const styles = read('resources/css/pm-home-v2-sections.css');
    const component = read('resources/js/components/home/v2/HomeCommunity.tsx');
    const picker = read('resources/js/components/home/HomeEngagement.tsx');
    assert.match(tokens, /--pm-v2-font-body: \.9375rem/);
    assert.match(tokens, /--pm-v2-font-ui: 1rem/);
    assert.match(styles, /\.pm-v2-scenario-card \{[^}]*min-height: 314px/);
    assert.match(styles, /\.pm-v2-scenario-card \.pm-v2-post-content > p \{[^}]*-webkit-line-clamp: 2/);
    assert.match(component, /scenario\?\.title/);
    assert.match(component, /scenario\?\.summary/);
    assert.match(component, /<span className="pm-v2-official-avatar"/);
    assert.match(picker, /prototypeLikeIcon && type === 'like' \? Heart/);
    assert.match(picker, /url && failedUrl !== url/);
});
