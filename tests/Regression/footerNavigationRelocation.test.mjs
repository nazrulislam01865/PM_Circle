import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const sidebar = read('resources/js/layouts/admin/AdminLayout.tsx');
const homeSections = read('resources/js/components/admin/homepage-sections.ts');
const homepage = read('resources/js/pages/admin/Homepage.tsx');
const controller = read('app/Http/Controllers/Admin/HomepageController.php');
const editor = read('resources/js/pages/admin/SiteFooterEditor.tsx');

test('footer editor belongs to Navigation control without duplicating Homepage control entry', () => {
    assert.doesNotMatch(homeSections, /key: 'footer'/);
    assert.doesNotMatch(homepage, /selected === 'footer'/);
    assert.match(sidebar, /base === '\/admin\/navigation'/);
    assert.match(sidebar, /<span>Footer control<\/span>/);
    assert.match(sidebar, /href="\/admin\/footer"/);
    assert.match(sidebar, /active === '\/admin\/navigation' \|\| active === '\/admin\/footer'/);
    assert.match(sidebar, /active === '\/admin\/homepage';/);
});

test('footer storage and access remain unchanged; previous homepage footer links are redirected', () => {
    assert.match(editor, /active="\/admin\/footer"/);
    assert.match(editor, /router\.put\('\/admin\/footer'/);
    assert.match(controller, /if \(\$requested === 'footer'\)/);
    assert.match(controller, /to_route\('admin\.footer\.edit'\)/);
    assert.match(read('routes/web.php'), /Route::get\('\/footer', \[SiteFooterController::class, 'edit'\]\)/);
    assert.doesNotMatch(read('resources/js/components/admin/catalog-groups.ts'), /key: 'footer_menu'/);
    assert.doesNotMatch(read('resources/js/components/admin/pmp-public-sections.ts'), /key: 'footer'/);
    assert.match(read('app/Http/Controllers/Admin/MasterDataController.php'), /query\('category'\) === 'footer_menu'/);
});
