import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('Both legal routes share the versioned public renderer and admin menus', () => {
    const routes = read('routes/web.php');
    const admin = read('resources/js/layouts/admin/AdminLayout.tsx');
    for (const key of ['terms','privacy']) {
        assert.ok(admin.includes(`href="/admin/legal/${key}"`));
        assert.ok(routes.includes(`LegalPageController::class, '${key}']`));
    }
    assert.match(routes, /middleware\(\['auth', 'pm.admin', 'verified'\]\)->prefix\('admin'\)/);
    assert.match(routes, /whereIn\('document', \['terms', 'privacy'\]\)/);
});

test('Draft writes and immutable version publication use locking and independent revisions', () => {
    const controller = read('app/Http/Controllers/Admin/LegalPageController.php');
    const publicService = read('app/Support/Legal/LegalPages.php');
    assert.match(controller, /lockForUpdate\(\)/);
    assert.match(controller, /revision.*!== \$revision/);
    assert.match(controller, /insertGetId/);
    assert.doesNotMatch(controller, /table\('legal_page_versions'\)[^\n]*->(?:update|delete)\(/);
    assert.match(publicService, /page.published_version_id/);
    assert.match(publicService, /self::defaults\(\$document\)/);
    assert.doesNotMatch(publicService, /->draft/);
});

test('Public content uses React text, constrained links and data-driven TOC', () => {
    const body = read('resources/js/components/pm/LegalContent.tsx');
    const page = read('resources/js/components/pm/LegalPage.tsx');
    assert.doesNotMatch(body + page, /dangerouslySetInnerHTML|innerHTML\s*=/);
    assert.match(read('resources/js/components/pm/legal-links.ts'), /url.protocol === 'https:'/);
    assert.match(body, /if \(kind === 'local'\)/);
    assert.match(page, /href=\{`#\$\{section.id\}`\}/);
    assert.match(page, /<LegalBody body=\{section.body\}/);
});

test('Registration receives exact public versions and resolves them under the same locks', () => {
    const register = read('app/Actions/Fortify/CreateNewUser.php');
    const service = read('app/Support/Legal/LegalPages.php');
    const signup = read('resources/js/pages/auth/RegisterStep2.tsx');
    assert.match(register, /DB::transaction[\s\S]*LegalPages::verifyAcceptance/);
    assert.match(register, /'accepted_terms_version' => \$legal\['terms'\]/);
    assert.match(register, /'accepted_privacy_version' => \$legal\['privacy'\]/);
    assert.match(service, /self::acceptance\(true\)/);
    assert.match(service, /app\(\)->isProduction\(\) && ! \$current\['ready'\]/);
    assert.match(signup, /\/terms\?version=\$\{legalVersions.terms\}/);
    assert.match(signup, /\/privacy\?version=\$\{legalVersions.privacy\}/);
});
