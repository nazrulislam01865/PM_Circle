import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const page = read('resources/js/pages/public/PolicyNotice.tsx');
const css = read('resources/css/pm-terms.css');
const defaults = JSON.parse(read('resources/js/data/refund-policy.json'));

test('Refund Policy preserves the public route and uses the shared homepage shell', () => {
    assert.match(read('routes/web.php'), /Route::get\('\/refund-policy', \[\\App\\Http\\Controllers\\PublicSite\\ContentPagesController::class, 'refundPolicy'\]\)->name\('refund-policy'\)/);
    assert.match(read('app/Http/Controllers/PublicSite/ContentPagesController.php'), /Inertia::render\('public\/PolicyNotice', \['content' => PublicPageContent::load\('refund-policy'\)\]\)/);
    assert.match(page, /<PublicLayout siteLayout homePrototype guideLayout banner=\{\{[^\n]*\}\}>/);
    assert.doesNotMatch(page, /fetch\(|axios\.|useEffect\(|router\.get\(|has not been published yet/);
    assert.ok(read('app/Support/Admin/SiteFooterContent.php').includes("$link('Refund Policy', '/refund-policy')"));
});

test('Prototype text, navigation and support destinations are preserved as editable defaults', () => {
    const {banner, navigation, ...sections} = defaults;
    const titles = ['Monthly plan payments', 'Cancel your plan any time', 'Payment and access issues', 'Consumer rights'];
    assert.deepEqual(Object.values(sections).map(section => section.title), titles);
    assert.equal(sections['cancel-your-plan'].navigationTitle, 'Cancel your plan');
    assert.equal(banner.description, 'Monthly plan payments, cancellations and purchase support.');
    assert.equal(navigation.title, 'On this page');
    const paragraphs = Object.values(sections).flatMap(section => section.paragraphs);
    assert.match(paragraphs.map(p => p.text).join(' '), /Completed monthly plan payments are non-refundable/);
    assert.match(paragraphs.map(p => p.text).join(' '), /Cancellation does not generate a prorated refund\./);
    assert.match(paragraphs.map(p => p.text).join(' '), /Any refund or other remedy required by applicable law remains available\./);
    assert.deepEqual(paragraphs.filter(p => p.href).map(p => [p.href,p.linkLabel]), [['/contact','contact PM Circle support through ITQAN Consulting'],['/contact','report the issue'],['/terms','Terms and Conditions']]);
    for (const id of Object.keys(sections)) assert.ok(page.includes(`'${id}'`));
    assert.match(page, /href="\/">Home/);
    assert.match(page, /href=\{`#\$\{section.id\}`\}/);
    assert.match(page, /id=\{section.id\}/);
    assert.match(page, /aria-label=\{navigation.title\}/);
    assert.match(page, /<Paragraph \{\.\.\.paragraph\}\/>/);
    assert.doesNotMatch(page, /dangerouslySetInnerHTML|Draft for review|Homepage design mockup/);
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
