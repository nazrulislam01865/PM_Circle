import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const editor = read('resources/js/pages/admin/SiteFooterEditor.tsx');
const controller = read('app/Http/Controllers/Admin/SiteFooterController.php');
const footer = read('resources/js/components/home/v2/HomeFooter.tsx');
const identity = read('resources/js/components/pm/FooterIdentity.tsx');
const member = read('resources/js/components/pm/MemberFooter.tsx');
const request = read('app/Support/Admin/SiteFooterValidation.php');

test('one admin-only footer editor writes only shared footer data with revision protection', () => {
    const routes = read('routes/web.php');
    assert.match(routes, /Route::get\('\/footer', \[SiteFooterController::class, 'edit'\]\)/);
    assert.match(routes, /Route::put\('\/footer', \[SiteFooterController::class, 'update'\]\)/);
    assert.match(controller, /lockForUpdate\(\)/);
    assert.match(controller, /\$content\[SiteFooterContent::KEY\] = \$validated\['footer'\]/);
    assert.match(controller, /PmpPublicContent::clearCache\(\)/);
    assert.match(read('app/Http/Requests/Admin/UpdateSiteFooterRequest.php'), /is_admin === true/);
    assert.match(read('app/Http/Requests/Admin/UpdatePmpPublicPageRequest.php'), /'content.footer' => \['exclude'\]/);
    assert.match(read('app/Http/Controllers/Admin/PmpPublicPageController.php'), /foreach \(\['footer', \\App\\Support\\Admin\\SiteFooterContent::KEY\]/);
});

test('footer uses validated ordered content and no hardcoded link groups', () => {
    for (const field of ['brand_name', 'brand_href', 'description', 'columns', 'socials', 'copyright_label', 'bottom_links', 'member_links', 'legal_notice']) {
        assert.ok(request.includes(field), field);
    }
    assert.match(footer, /content\.columns\.filter/);
    assert.match(footer, /columns\.map/);
    assert.match(footer, /content\.bottom_links\.map/);
    assert.match(footer, /content\.legal_notice/);
    assert.match(identity, /content\.socials\.filter/);
    assert.match(identity, /active\.map/);
    assert.match(identity, /content\.brand_name/);
    assert.match(member, /content\.member_links\.map/);
    assert.match(member, /content\.legal_notice/);
    assert.match(read('resources/js/components/exam/PmpPublicFooter.tsx'), /return <HomeFooter content=\{content\}\/>/);
    assert.match(read('app/Http/Middleware/HandleInertiaRequests.php'), /'siteFooter' => fn/);
});

test('editor provides create remove reorder and reusable controls for every link group', () => {
    assert.match(editor, /<ContentField/);
    assert.match(editor, /<RepeatableItems/);
    assert.match(editor, /HomepageImageUploader/);
    assert.match(editor, /fallbackPreview=/);
    assert.match(editor, /routeChoices/);
    assert.match(editor, /Add column/);
    assert.match(editor, /Add social link/);
    assert.match(editor, /data\.columns\.filter/);
    assert.match(editor, /data\.socials\.filter/);
    assert.match(editor, /moved\(data\.columns/);
    assert.match(editor, /moved\(data\.socials/);
    assert.match(editor, /<HomeFooter content=\{data\}/);
    assert.match(editor, /<MemberFooter content=\{data\}/);
    assert.match(editor, /disabled=\{saving \|\| uploading\}/);
    assert.doesNotMatch(editor, /show_newsletter|payment_methods|explore_links|support_links/);
});

test('destinations and images are validated and the two footer renderers use shared flags', () => {
    for (const key of ['show_brand', 'show_about', 'show_social', 'show_legal', 'show_notice', 'show_copyright', 'show_member_footer', 'show_member_notice']) {
        assert.ok(request.includes(`'${key}'`));
        assert.ok(editor.includes(`'${key}'`));
        assert.ok((footer + member).includes(`content.${key}`));
    }
    assert.match(request, /HomepageMasterData::isAllowedNewValue/);
    assert.match(request, /filter_var\(\$value, FILTER_VALIDATE_URL\)/);
    assert.match(request, /Storage::disk\('public'\)/);
    assert.match(request, /Rule::in\(SiteFooterContent::SOCIAL_ICONS\)/);
    assert.match(identity, /safeFooterHref/);
    assert.match(identity, /noopener noreferrer/);
    assert.doesNotMatch(footer, /pm-v2-footer-payments/);
});
