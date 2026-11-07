import { useCallback, useEffect, useRef, useState } from 'react';

export type FeedPage<T> = {
    data: T[];
    next_cursor: string | null;
    previous_cursor?: string | null;
    has_more: boolean;
};

type ItemWithId = { id: number };

type Filter = {
    tab: string;
    viewerId?: number;
    topic?: string;
    search?: string | null;
    context?: 'community' | 'dashboard';
};

type CachedPage<T> = { items: T[]; cursor: string | null; expires: number };
// Short-lived, per-viewer browser cache for navigation/backscroll. No persistent or shared cache.
const pageCache = new Map<string, CachedPage<ItemWithId>>();

function restored<T extends ItemWithId>(key: string, initial: FeedPage<T>): { items: T[]; cursor: string | null } {
    const saved = pageCache.get(key) as CachedPage<T> | undefined;
    if (!saved || saved.expires < Date.now() || initial.data.some((post, index) => saved.items[index]?.id !== post.id)) {
        return { items: initial.data, cursor: initial.next_cursor };
    }
    return { items: [...initial.data, ...saved.items.slice(initial.data.length)], cursor: saved.cursor };
}

/** Server-hydrated first 20; at most one 12-post request at a time. No per-card requests. */
export function useSlidingFeed<T extends ItemWithId>(initial: FeedPage<T>, filter: Filter) {
    const key = JSON.stringify([filter.viewerId ?? 0, filter.tab, filter.topic ?? 'All', filter.search ?? '', filter.context ?? 'community']);
    const restoredInitial = useRef(restored(key, initial));
    const [items, setItems] = useState<T[]>(restoredInitial.current.items);
    const [nextCursor, setNextCursor] = useState(restoredInitial.current.cursor);
    const [stateKey, setStateKey] = useState(key);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    const controller = useRef<AbortController | null>(null);
    const activeCursor = useRef(restoredInitial.current.cursor);
    const activeKey = useRef(key);

    useEffect(() => {
        controller.current?.abort();
        controller.current = null;
        inFlight.current = false;
        activeKey.current = key;
        const fresh = restored(key, initial);
        activeCursor.current = fresh.cursor;
        setItems(fresh.items);
        setNextCursor(fresh.cursor);
        setStateKey(key);
        setLoading(false);
        setError('');
        return () => controller.current?.abort();
        // The initial page is authoritative after Inertia navigation, even if filters are unchanged.
    }, [key, initial.data, initial.next_cursor]);

    useEffect(() => {
        if (stateKey !== key) return;
        pageCache.delete(key); // insertion order implements simple LRU by filter key
        pageCache.set(key, { items, cursor: nextCursor, expires: Date.now() + 30_000 });
        while (pageCache.size > 8) pageCache.delete(pageCache.keys().next().value!);
    }, [stateKey, key, items, nextCursor]);

    const loadMore = useCallback(async () => {
        if (stateKey !== key || inFlight.current || !activeCursor.current || error) return;
        inFlight.current = true;
        setLoading(true);
        const requestKey = activeKey.current;
        const abort = new AbortController();
        controller.current = abort;
        const cursor = activeCursor.current;
        const params = new URLSearchParams({
            cursor,
            tab: filter.tab,
            topic: filter.topic ?? 'All',
            context: filter.context ?? 'community',
        });
        if (filter.search?.trim()) params.set('search', filter.search.trim());

        try {
            const response = await fetch(`/community/feed-page?${params}`, {
                credentials: 'same-origin', signal: abort.signal,
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!response.ok) throw new Error(response.status === 429
                ? 'Too many requests. Please try again shortly.'
                : 'Could not load more discussions.');
            const page = await response.json() as FeedPage<T>;
            if (abort.signal.aborted || activeKey.current !== requestKey) return;
            setItems(previous => {
                const known = new Set(previous.map(post => post.id));
                return [...previous, ...page.data.filter(post => !known.has(post.id))];
            });
            activeCursor.current = page.next_cursor;
            setNextCursor(page.next_cursor);
            setError('');
        } catch (cause) {
            if (!abort.signal.aborted && activeKey.current === requestKey) {
                setError(cause instanceof Error ? cause.message : 'Could not load more discussions.');
            }
        } finally {
            if (activeKey.current === requestKey) {
                inFlight.current = false;
                controller.current = null;
                setLoading(false);
            }
        }
    }, [key, stateKey, filter.tab, filter.topic, filter.search, filter.context, error]);

    const updateItem = useCallback((id: number, change: Partial<T>) => {
        setItems(previous => previous.map(post => post.id === id ? { ...post, ...change } : post));
    }, []);

    // Filter switches must not display one frame of the previous feed while effects reset.
    const ready = stateKey === key;
    return { items: ready ? items : initial.data, loadMore, loading: ready && loading,
        error: ready ? error : '', hasMore: (ready ? nextCursor : initial.next_cursor) !== null,
        retry: () => setError(''), updateItem };
}
