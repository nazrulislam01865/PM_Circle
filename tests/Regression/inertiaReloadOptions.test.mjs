import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('scenario AI feedback polling only reloads responses and preserves its interval', () => {
    const source = read('resources/js/pages/scenarios/Show.tsx');
    assert.match(source, /router\.reload\(\{ only: \['responses'\] \}\)/);
    assert.match(source, /\}, 8000\)/);
});

test('partial reloads avoid preserveScroll and preserveState options unsupported by Inertia reload', () => {
    const sources = [
        read('resources/js/pages/scenarios/Show.tsx'),
        read('resources/js/components/dashboard/DashboardFeed.tsx'),
        read('resources/js/components/community/PostComposerDialog.tsx'),
    ];
    for (const source of sources) {
        assert.doesNotMatch(source, /router\.reload\(\{[^}]*\bpreserve(?:Scroll|State)\s*:/);
    }
    assert.match(sources[1], /router\.reload\(\{ only: \['dashboard'\] \}\)/);
    assert.match(sources[2], /router\.reload\(\)/);
});
