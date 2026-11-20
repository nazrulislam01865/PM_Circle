import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const editor = read('resources/js/pages/admin/SiteFooterEditor.tsx');
const controller = read('app/Http/Controllers/Admin/SiteFooterController.php');
const footer = read('resources/js/components/exam/PmpPublicFooter.tsx');
const request = read('app/Support/Admin/SiteFooterValidation.php');

test('one admin-only footer editor writes only shared footer data with revision protection', () => {
    const routes = read('routes/web.php');
    assert.match(routes, /Route::get\('\/footer', \[SiteFooterController::class, 'edit'\]\)/);
    assert.match(routes, /Route::put\('\/footer', \[SiteFooterController::class, 'update'\]\)/);
    assert.match(controller, /lockForUpdate\(\)/);
    assert.match(controller, /\$content\['footer'\] = \$validated\['footer'\]/);
    assert.match(controller, /PmpPublicContent::clearCache\(\)/);
    assert.match(read('app/Http/Requests/Admin/UpdateSiteFooterRequest.php'), /is_admin === true/);
});

test('footer content actually uses configured public labels, links and legal copy', () => {
    for (const field of ['about_heading', 'newsletter_description', 'payment_heading', 'payment_methods', 'copyright_label', 'legal_links', 'legal_notice', 'show_disclaimer']) {
        assert.match(footer, new RegExp(`content\\.${field}`), field);
        assert.match(request, new RegExp(`\\$prefix\\.${field}`), field);
    }
    assert.match(footer, /content\.social\[key\]/);
    assert.doesNotMatch(footer, /href="https:\/\/github\.com\/"/);
    assert.match(read('app/Http/Middleware/HandleInertiaRequests.php'), /'siteFooter' => fn/);
});

test('editor uses centralized reusable controls and fixed-icon previews', () => {
    assert.match(editor, /<ContentField/);
    assert.match(editor, /<RepeatableItems/);
    assert.match(editor, /HomepageImageUploader/);
    assert.match(editor, /fallbackPreview=/);
    assert.match(editor, /routeChoices/);
    assert.match(read('resources/js/components/admin/HomepageFields.tsx'), /<PMDropdown/);
    assert.match(read('resources/js/layouts/admin/AdminLayout.tsx'), /href="\/admin\/footer"/);
});


test('all footer screenshot elements have admin controls and safe rendering', () => {
    const defaults = read('config/pmp-public.php');
    const types = read('resources/js/types/pmp-public.ts');
    for (const key of ['brand_name', 'brand_tagline', 'brand_logo', 'show_brand', 'show_about', 'show_explore', 'show_support', 'show_social', 'show_newsletter', 'show_newsletter_form', 'show_payments', 'show_legal']) {
        assert.match(defaults, new RegExp(`'${key}'`), `default ${key}`);
        assert.match(types, new RegExp(`${key}:`), `typed ${key}`);
        assert.ok(request.includes(`"$prefix.${key}"`), `validated ${key}`);
        assert.match(editor, new RegExp(`'${key}'`), `editable ${key}`);
        assert.ok(footer.includes(`content.${key}`), `rendered ${key}`);
    }
    assert.match(editor, /PmpPublicFooter content=\{data\}/);
    assert.match(editor, /kind: 'image'/);
    assert.match(footer, /method\.image/);
    assert.match(footer, /pm-unified-footer-brand-image/);
    assert.match(footer, /disabled title="Newsletter sign-up is not available yet"/);
});
