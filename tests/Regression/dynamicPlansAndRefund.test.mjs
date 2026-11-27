import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
const defaults = JSON.parse(read('resources/js/data/compare-plans.json'));
const editor = read('resources/js/pages/admin/PublicPageEditor.tsx');
const comparison = read('resources/js/components/billing/PricingComparisonContent.tsx');
const request = read('app/Http/Requests/Admin/UpdatePublicPageRequest.php');

test('pricing preserves catalogue as the canonical price source; content has no amount or duration overrides', () => {
    assert.match(read('app/Http/Controllers/PublicSite/HomeController.php'), /'plans' => \$onboarding->catalog\(\), 'content' => PublicPageContent::load\('compare-plans'\)/);
    assert.match(comparison, /planByCode\(code\)\?\.prices.find/);
    assert.match(comparison, /selectedPlus.amount_minor \/ selectedPlus.months/);
    assert.doesNotMatch(JSON.stringify(defaults), /amount_minor|currency|"prices"/);
    assert.deepEqual(['community','learning','career'].map(key => defaults[key].rows.length), [7,5,7]);
    assert.match(comparison, /<PMDropdown id="pm-compare-duration"/);
    assert.match(comparison, /<PMDropdown id="pm-compare-pro-duration"/);
    assert.match(comparison, /<PlanComparisonRows sections=\{\[settings.community, settings.learning, settings.career\]\}/);
    assert.match(read('resources/js/pages/public/Pricing.tsx'), /content=\{content\}/);
});

test('both pages have allowlisted admin routes and individual editor sections', () => {
    assert.equal(read('routes/web.php').match(/whereIn\('page', \['about', 'trends', 'compare-plans', 'refund-policy'\]\)/g).length, 2);
    for (const page of ['compare-plans','refund-policy']) {
        const content = JSON.parse(read(`resources/js/data/${page}.json`));
        for (const section of Object.keys(content)) {
            assert.ok(editor.includes(`['${section}',`));
            assert.ok(request.includes(`'${page}:${section}'`));
        }
        assert.ok(read('resources/js/layouts/admin/AdminLayout.tsx').includes(`/admin/public-pages/${page}`));
    }
    assert.match(request, /\$this->user\(\)\?->is_admin === true/);
    assert.match(request, /substr_count\(\$paragraph\['text'\], \$label\) !== 1/);
    assert.match(request, /Rule::in\(/);
    assert.match(read('app/Http/Controllers/Admin/PublicPageController.php'), /lockForUpdate\(\)/);
    assert.match(read('app/Http/Controllers/Admin/PublicPageController.php'), /PublicPageContent::clear\(\$page\)/);
});

test('public comparison and member duration controls use shared central roles', () => {
    const css = read('resources/css/pm-comparison.css').split('/* Public Compare Plans')[1];
    const tokens = read('resources/css/pm-design-tokens.css');
    assert.ok(css);
    for (const [,token] of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(tokens.includes(`${token}:`), token);
    assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|font-size:\s*\d/i);
    assert.match(css, /\.pm-compare-duration \.pm-dropdown-trigger/);
    assert.match(comparison, /content \? ' pm-public-compare' : ''/);
});
