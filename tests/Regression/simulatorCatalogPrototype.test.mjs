import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const card = read('resources/js/components/exam/SimulatorCatalog.tsx');
const page = read('resources/js/pages/exam/Browse.tsx');
const route = read('routes/web.php');
const styles = read('resources/css/pm-simulator-catalog.css');

test('browse page is distinct from protected PMP and reuses homepage header and footer', () => {
    assert.match(route, /Route::inertia\('\/simulators', 'exam\/Browse'\)/);
    assert.match(route, /Route::inertia\('\/exam-simulator\/pmp', 'exam\/Browse'\)/);
    assert.match(route, /Route::get\('\/exam-simulator\/pmp\/details', PmpPublicPageController::class\)/);
    assert.match(card, /href: '\/exam-simulator\/pmp\/details'/);
    assert.match(card, /<CatalogAction href="\/exam-simulator\/pmp\/details" primary>/);
    assert.match(page, /<PublicLayout siteLayout homePrototype/);
    assert.match(page, /<SimulatorCatalog promotion=\{promotion\}/);
});

test('prototype preserves five certification cards, images and the PMP feature panel', () => {
    for (const code of ['PMP', 'CSM', 'PMI-PBA', 'CAPM', 'PMI-ACP']) {
        assert.match(card, new RegExp(`code: '${code}'`));
    }
    for (const photo of ['exam.webp', 'scrum.webp', 'stakeholder.webp', 'foundations.webp', 'hero-community.webp']) {
        assert.ok(existsSync(new URL(`../../public/images/home/prototype/${photo}`, import.meta.url)), photo);
    }
    assert.match(card, /filtered\.slice\(0, 3\)/);
    assert.match(card, /showSpotlight && <PmpSpotlight\/>/);
    assert.match(card, /filtered\.slice\(3\)/);
});

test('filters, clear state, empty results and review paging are functional UI controls', () => {
    for (const token of ['type="search"', 'Certification area', 'Availability', 'Free or paid', 'Clear filters', 'No simulators match your filters', 'Previous reviews', 'Next reviews']) {
        assert.ok(card.includes(token), token);
    }
    assert.match(card, /useMemo\(\(\) => prototypeSimulators.filter/);
    assert.doesNotMatch(card, /router\.(get|post)|fetch\(|axios|DB::/);
});

test('styling is scoped and imported after existing homepage styles', () => {
    assert.match(styles, /\.pm-simulators-page/);
    assert.match(styles, /\.pm-sim-card-grid/);
    assert.match(styles, /@media \(max-width: 540px\)/);
    assert.match(read('resources/css/app.css'), /@import '\.\/pm-home-v2-responsive\.css';\s*@import '\.\/pm-simulator-catalog\.css';/);
});
