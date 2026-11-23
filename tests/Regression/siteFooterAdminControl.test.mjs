import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const editor = read('resources/js/pages/admin/SiteFooterEditor.tsx');
const controller = read('app/Http/Controllers/Admin/SiteFooterController.php');
const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
const identity = read('resources/js/components/pm/FooterIdentity.tsx');
const compatibility = read('resources/js/components/exam/PmpPublicFooter.tsx');
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

test('footer uses the existing validated content, with the approved prototype copy and no legacy variant', () => {
    for (const field of ['about_heading', 'newsletter_description', 'payment_heading', 'payment_methods', 'copyright_label', 'legal_links', 'legal_notice', 'show_disclaimer']) {
        assert.match(request, new RegExp(`\\$prefix\\.${field}`), field);
    }
    for (const field of ['legal_links', 'show_legal', 'show_explore', 'show_support']) {
        assert.match(footer, new RegExp(`content\\.${field}`), `canonical: ${field}`);
    }
    assert.match(identity, /content\.social\[key\]/);
    assert.match(identity, /content\.brand_name/);
    assert.match(compatibility, /return <HomeFooter content=\{content\}\/>/);
    assert.doesNotMatch(compatibility, /pm-unified-footer-(dark|compact)/);
    assert.doesNotMatch(footer, /href="https:\/\/github\.com\//);
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


test('admin controls and shared footer rendering continue using validated settings', () => {
    const defaults = read('config/pmp-public.php');
    const types = read('resources/js/types/pmp-public.ts');
    for (const key of ['brand_name', 'brand_tagline', 'brand_logo', 'show_brand', 'show_about', 'show_explore', 'show_support', 'show_social', 'show_newsletter', 'show_newsletter_form', 'show_payments', 'show_legal']) {
        assert.match(defaults, new RegExp(`'${key}'`), `default ${key}`);
        assert.match(types, new RegExp(`${key}:`), `typed ${key}`);
        assert.ok(request.includes(`"$prefix.${key}"`), `validated ${key}`);
        assert.match(editor, new RegExp(`'${key}'`), `editable ${key}`);
    }
    assert.match(identity, /content\.brand_name/);
    assert.match(identity, /content\.brand_logo/);
    assert.match(footer, /content\.show_brand/);
    assert.match(footer, /content\.show_social/);
    assert.doesNotMatch(footer, /pm-v2-footer-payments/); // No unapproved payment row in reference footer.
    assert.match(identity, /pm-unified-footer-brand-image/);
    assert.match(editor, /HomeFooter content=\{data\}/);
    assert.match(editor, /kind: 'image'/);
});
