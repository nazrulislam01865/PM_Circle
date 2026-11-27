/** Pure bounded-window state. Only retained IDs, payloads and edge cursors survive eviction. */
export type FeedPage<T> = { data: T[]; next_cursor: string | null; previous_cursor?: string | null; has_more: boolean };
export type Keyed = { id: number };
export type Direction = 'next' | 'previous';
export type Viewport = { protectedIds: Set<number>; heights: Map<number, number>; anchor: { id: number; offsetPx: number } | null };
type Batch = { ids: number[]; next: string | null; prev: string | null };
export type FeedWindow<T extends Keyed> = { batches: Batch[]; entities: Map<number, T>; topPx: number; bottomPx: number; anchor: Viewport['anchor'] };
export const ACTIVE_TARGET = 96;
export const ACTIVE_CAP = 120;
export function initialWindow<T extends Keyed>(page: FeedPage<T>): FeedWindow<T> {
    return { batches: [{ ids: [...new Set(page.data.map(p => p.id))], next: page.next_cursor, prev: page.previous_cursor ?? null }],
        entities: new Map(page.data.map(p => [p.id, p])), topPx: 0, bottomPx: 0, anchor: null };
}
export function edge<T extends Keyed>(state: FeedWindow<T>, direction: Direction): string | null {
    return direction === 'next' ? state.batches.at(-1)?.next ?? null : state.batches[0]?.prev ?? null;
}
export function mergeWindow<T extends Keyed>(state: FeedWindow<T>, page: FeedPage<T>, direction: Direction,
    bounded: boolean, viewport: Viewport | null, estimate: number): FeedWindow<T> | null {
    const entities = new Map(state.entities);
    const ids: number[] = [];
    for (const post of page.data) {
        if (entities.has(post.id)) continue;
        entities.set(post.id, post); ids.push(post.id);
    }
    const batch = { ids, next: page.next_cursor, prev: page.previous_cursor ?? null };
    const batches = state.batches.map(b => ({ ...b }));
    let { topPx, bottomPx } = state;
    if (!ids.length) {
        // Empty continuation still advances the edge; never accumulate empty batches.
        if (direction === 'next') { batches[batches.length - 1].next = batch.next; if (!batch.next) bottomPx = 0; }
        else { batches[0].prev = batch.prev; if (!batch.prev) topPx = 0; }
        return { ...state, batches, topPx, bottomPx, anchor: viewport?.anchor ?? null };
    }
    const height = (batch: Batch) => batch.ids.reduce((sum, id) => sum + (viewport?.heights.get(id) ?? estimate), 0);
    if (direction === 'next') { batches.push(batch); bottomPx = batch.next ? Math.max(0, bottomPx - height(batch)) : 0; }
    else { batches.unshift(batch); topPx = batch.prev ? Math.max(0, topPx - height(batch)) : 0; }
    if (bounded) {
        // Preserve visible and active editors. No payload budget escape if eviction is blocked.
        while (entities.size > ACTIVE_TARGET && batches.length > 1) {
            const index = direction === 'next' ? 0 : batches.length - 1;
            const candidate = batches[index];
            if (!viewport || candidate.ids.some(id => viewport.protectedIds.has(id))) break;
            if (direction === 'next') topPx += height(candidate); else bottomPx += height(candidate);
            for (const id of candidate.ids) entities.delete(id);
            batches.splice(index, 1);
        }
        if (entities.size > ACTIVE_CAP) return null;
    }
    return { batches, entities, topPx, bottomPx, anchor: viewport?.anchor ?? null };
}

export function removeFromWindow<T extends Keyed>(state: FeedWindow<T>, id: number, anchor: Viewport['anchor']): FeedWindow<T> {
    const entities = new Map(state.entities); entities.delete(id);
    const batches = state.batches.map(b => ({ ...b, ids: b.ids.filter(value => value !== id) })).filter(b => b.ids.length);
    const prev = edge(state, 'previous'); const next = edge(state, 'next');
    if (!batches.length) batches.push({ ids: [], prev, next });
    else { batches[0].prev = prev; batches[batches.length - 1].next = next; }
    return { ...state, entities, batches, anchor: anchor?.id === id ? null : anchor };
}
