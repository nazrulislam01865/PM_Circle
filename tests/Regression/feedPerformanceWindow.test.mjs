import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initialWindow, edge, mergeWindow, removeFromWindow, ACTIVE_CAP, ACTIVE_TARGET } from '../../resources/js/hooks/community/feedWindow.ts';

const all = Array.from({ length: 1000 }, (_, i) => ({ id: 1000 - i, body: 'post' }));
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const flatten = state => state.batches.flatMap(batch => batch.ids);
const page = (start, count) => {
    const data = all.slice(start, start + count);
    return { data, previous_cursor: start > 0 ? `p:${start}` : null,
        next_cursor: start + count < all.length ? `n:${start + count}` : null, has_more: start + count < all.length };
};
const getPage = token => { const [direction, offset] = token.split(':'); const index = Number(offset);
    return direction === 'n' ? page(index, 12) : page(Math.max(0, index - 12), Math.min(index, 12)); };
function viewport(state, direction, pinAll = false) {
    const ids = flatten(state);
    const protectedIds = new Set(pinAll ? ids : direction === 'next' ? ids.slice(-12) : ids.slice(0, 12));
    return { protectedIds, heights: new Map(ids.map(id => [id, 100 + id % 17])), anchor: { id: direction === 'next' ? ids.at(-8) : ids[4], offsetPx: 30 } };
}
function assertWindow(state) {
    const ids = flatten(state);
    assert.ok(ids.length <= ACTIVE_CAP);
    assert.equal(state.entities.size, ids.length);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
    for (let i = 1; i < ids.length; i++) assert.equal(ids[i - 1] - ids[i], 1);
    assert.ok(state.topPx >= 0 && state.bottomPx >= 0);
}
test('1000-post forward and backward fixture preserves ordering, cursors and bounded payloads', () => {
    let state = initialWindow(page(0, 20));
    const seen = new Set(flatten(state));
    let steps = 0;
    while (edge(state, 'next')) {
        assert.ok(++steps < 100);
        state = mergeWindow(state, getPage(edge(state, 'next')), 'next', true, viewport(state, 'next'), 120);
        assert.ok(state); assertWindow(state); assert.ok(state.entities.size <= ACTIVE_TARGET);
        flatten(state).forEach(id => seen.add(id));
    }
    assert.equal(seen.size, 1000); assert.equal(state.bottomPx, 0); assert.ok(state.topPx > 0);
    const back = new Set(flatten(state)); steps = 0;
    while (edge(state, 'previous')) {
        assert.ok(++steps < 100);
        state = mergeWindow(state, getPage(edge(state, 'previous')), 'previous', true, viewport(state, 'previous'), 120);
        assert.ok(state); assertWindow(state); assert.ok(state.entities.size <= ACTIVE_TARGET);
        flatten(state).forEach(id => back.add(id));
    }
    assert.equal(back.size, 1000); assert.equal(state.topPx, 0);
    assert.equal(flatten(state)[0], 1000);
});
test('pinned editors block eviction instead of violating the hard cap', () => {
    let state = initialWindow(page(0, 20));
    while (state.entities.size + 12 <= ACTIVE_CAP) state = mergeWindow(state, getPage(edge(state, 'next')), 'next', true, viewport(state, 'next', true), 120);
    const cursor = edge(state, 'next');
    assert.equal(mergeWindow(state, getPage(cursor), 'next', true, viewport(state, 'next', true), 120), null);
    assert.equal(edge(state, 'next'), cursor);
    const resumed = mergeWindow(state, getPage(cursor), 'next', true, viewport(state, 'next'), 120);
    assert.ok(resumed.entities.size <= ACTIVE_TARGET);
});
test('duplicate responses do not add payloads or empty batches; removed cards are released', () => {
    const state = initialWindow(page(0, 20));
    const duplicate = mergeWindow(state, page(0, 20), 'next', true, viewport(state, 'next'), 120);
    assert.equal(duplicate.entities.size, 20); assert.equal(duplicate.batches.length, 1);
    let removed = duplicate;
    for (const id of flatten(duplicate)) removed = removeFromWindow(removed, id, null);
    assert.equal(removed.entities.size, 0); assert.equal(removed.batches.length, 1); assert.equal(edge(removed, 'next'), edge(state, 'next'));
});
test('request cleanup is generation and operation bound; no private snapshot cache', () => {
    const hook = read('resources/js/hooks/community/useSlidingFeed.ts');
    assert.match(hook, /request\.current === operation && generation\.current === operation\.generation/);
    assert.match(hook, /if \(stillCurrent\(\)\) \{ request\.current = null/);
    assert.doesNotMatch(hook, /pageCache|localStorage|sessionStorage/);
});
test('deferred work and rollout flags remain independent', () => {
    const controller = read('app/Http/Controllers/Dashboard/DashboardController.php');
    assert.match(controller, /'feed' => fn \(\) => \$overview->feed/);
    assert.match(controller, /'statistics' => Inertia::defer/);
    assert.match(controller, /'planUsage' => Inertia::defer/);
    assert.match(read('config/community.php'), /PMC_PROGRESSIVE_DASHBOARD_ENABLED', false/);
    assert.match(read('config/community.php'), /PMC_BOUNDED_FEED_ENABLED', false/);
});
