import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = file => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');

test('homepage search uses a bounded header popover, not a full-screen topic dialog', () => {
    const css = read('resources/css/pm-home-v2-layout.css');
    const search = read('resources/js/components/home/v2/HomeSearch.tsx');
    assert.match(css, /\.pm-home-v2-shell \.pm-v2-header-search \{[\s\S]*?position: absolute;[\s\S]*?max-height: min\(70vh,[^}]*overflow-y: auto;/);
    assert.match(css, /right: max\(var\(--s4\)/);
    assert.match(search, /role="dialog"/);
    assert.match(search, /aria-labelledby="pm-v2-search-heading"/);
    assert.match(search, /if \(event\.key === 'Escape'\)/);
    assert.match(search, /document\.addEventListener\('pointerdown'/);
    assert.match(search, /panelRef\.current\?\.contains\(target\)/);
});

test('search initially shows only four popular destinations; filtered searches keep existing routes', () => {
    const search = read('resources/js/components/home/v2/HomeSearch.tsx');
    const tokens = read('resources/css/pm-design-tokens.css');
    assert.match(search, /\['\/exam-simulator\/pmp', '\/learning', '\/community', '\/daily-challenge'\]/);
    assert.match(search, /destinations\.filter\(item => item\.label\.toLowerCase\(\)\.includes/);
    assert.match(search, /searchText && \(/);
    assert.match(search, /router\.get\('\/community', \{ search: searchText \}, \{ preserveState: false \}\)/);
    assert.match(search, /encodeURIComponent\(searchText\)/);
    assert.doesNotMatch(search, /fetch\(|axios\.|router\.post\(/);
    assert.match(tokens, /--pm-v2-search-width:/);
    assert.match(tokens, /--pm-v2-search-title-font:/);
});
