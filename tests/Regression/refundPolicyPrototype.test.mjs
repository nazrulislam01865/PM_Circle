import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/public/PolicyNotice.tsx');
const css = read('resources/css/pm-terms.css');

test('Refund Policy preserves the public route and uses the shared homepage shell', () => {
    assert.match(read('routes/web.php'), /Route::inertia\('\/refund-policy', 'public\/PolicyNotice'\)->name\('refund-policy'\)/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout banner=\{\{[^\n]*\}\}>/);
    assert.doesNotMatch(page, /fetch\(|axios\.|useEffect\(|router\.get\(|has not been published yet/);
    assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes("$link('Refund Policy', '/refund-policy')"));
});

test('Prototype text, navigation and support destinations are present', () => {
    const titles = ['Monthly plan payments', 'Cancel your plan any time', 'Payment and access issues', 'Consumer rights'];
    assert.deepEqual([...page.slice(0, page.indexOf('<PublicLayout')).matchAll(/title: '([^']+)'/g)].map(match => match[1]), titles);
    assert.match(page, /navigationTitle: 'Cancel your plan'/);
    assert.match(page, /Monthly plan payments, cancellations and purchase support\./);
    assert.match(page, /Completed monthly plan payments are non-refundable/);
    assert.match(page, /Cancellation does not generate a prorated refund\./);
    assert.match(page, /Any refund or other remedy required by applicable law remains available\./);
    assert.match(page, /href="\/contact">contact PM Circle support through ITQAN Consulting/);
    assert.match(page, /href="\/contact">report the issue/);
    assert.match(page, /href="\/terms">Terms and Conditions/);
    assert.match(page, /href="\/">Home/);
    const ids = [...page.matchAll(/id: '([^']+)'/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, 4);
    assert.match(page, /href=\{`#\$\{section.id\}`\}/);
    assert.match(page, /id=\{section.id\}/);
    assert.match(page, /aria-label="On this page"/);
    assert.doesNotMatch(page, /Draft for review|Homepage design mockup/);
});

test('Refund layout reuses central legal styles and scopes its adjustments', () => {
    assert.match(page, /className="pm-terms-page pm-refund-page"/);
    for (const name of ['banner', 'wrap', 'breadcrumb', 'main', 'grid', 'toc', 'article', 'section']) {
        assert.ok(page.includes(`pm-terms-${name}`));
        assert.ok(css.includes(`.pm-terms-${name}`));
    }
    assert.match(css, /\.pm-refund-page \.pm-terms-main \{ padding-bottom: var\(--pm-guide-s12\)/);
    assert.doesNotMatch(css, /--pm-v2-container-width\s*:/);
    assert.match(css, /@media \(max-width: 40\.625rem\)/);
    const adjustments = css.split('/* Refund Policy shares')[1];
    assert.ok(adjustments);
    assert.doesNotMatch(adjustments, /#[0-9a-fA-F]{3,8}\b|font-family:|font-size:/);
    const tokens = read('resources/css/pm-design-tokens.css');
    for (const [, token] of adjustments.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`), token);
});
