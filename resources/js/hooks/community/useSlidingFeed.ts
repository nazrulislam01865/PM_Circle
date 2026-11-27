import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { edge, initialWindow, mergeWindow, removeFromWindow, type Direction, type FeedPage, type Keyed, type Viewport } from './feedWindow';
export type { FeedPage } from './feedWindow';

type Filter = { tab: string; viewerId?: number; topic?: string; search?: string | null;
    context?: 'community' | 'dashboard'; bounded?: boolean; estimateHeight?: number };

/** Never restore stale private feed snapshots: the server authorizes every continuation. */
export function useSlidingFeed<T extends Keyed>(initial: FeedPage<T>, filter: Filter) {
    const key = JSON.stringify([filter.viewerId ?? 0, filter.tab, filter.topic ?? 'All', filter.search ?? '', filter.context ?? 'community', Boolean(filter.bounded)]);
    const [state, setState] = useState(() => initialWindow(initial));
    const [identity, setIdentity] = useState({ key, initial });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [restart, setRestart] = useState(false);
    const generation = useRef(0);
    const request = useRef<{ generation: number; abort: AbortController } | null>(null);
    const current = useRef(state);
    const scope = useRef({ key, initial });
    const viewport = useRef<(() => Viewport) | null>(null);
    const retryAfter = useRef(0);
    const failedDirection = useRef<Direction>('next');
    const ready = identity.key === key && identity.initial === initial;
    const commit = useCallback((next: typeof state) => { current.current = next; setState(next); }, []);

    useLayoutEffect(() => {
        generation.current++;
        request.current?.abort.abort(); request.current = null;
        scope.current = { key, initial };
        commit(initialWindow(initial)); setIdentity({ key, initial });
        setLoading(false); setError(''); setRestart(false); retryAfter.current = 0;
        return () => { generation.current++; request.current?.abort.abort(); request.current = null; };
    }, [key, initial, commit]);

    const load = useCallback(async (direction: Direction, retry = false) => {
        const cursor = edge(current.current, direction);
        if (!ready || request.current || !cursor || (!retry && error)) return;
        if (Date.now() < retryAfter.current) { setError('Please wait before retrying this feed request.'); return; }
        const operation = { generation: generation.current, abort: new AbortController() };
        request.current = operation; failedDirection.current = direction;
        const stillCurrent = () => request.current === operation && generation.current === operation.generation && !operation.abort.signal.aborted;
        setLoading(true);
        const params = new URLSearchParams({ cursor, tab: filter.tab, topic: filter.topic ?? 'All', context: filter.context ?? 'community' });
        if (filter.search?.trim()) params.set('search', filter.search.trim());
        try {
            const response = await fetch(`/community/feed-page?${params}`, { credentials: 'same-origin', signal: operation.abort.signal,
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
            if (!stillCurrent()) return;
            if (!response.ok) {
                if ([401, 403, 422].includes(response.status)) setRestart(true);
                if ([429, 503].includes(response.status)) {
                    const header = response.headers.get('Retry-After');
                    const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.max(0, (Date.parse(header) - Date.now()) / 1000) : 5;
                    retryAfter.current = Date.now() + (Number.isFinite(seconds) ? Math.max(1, seconds) : 5) * 1000;
                }
                throw new Error(response.status === 422 ? 'This feed has changed. Refresh the feed to continue.' : response.status === 401 || response.status === 403 ? 'Feed access changed. Refresh to continue.' : response.status === 429 ? 'Too many requests. Retry shortly.' : 'Could not load more discussions.');
            }
            const page = await response.json() as FeedPage<T>;
            if (!stillCurrent()) return;
            if (edge(current.current, direction) === null) return;
            const next = mergeWindow(current.current, page, direction, Boolean(filter.bounded), viewport.current?.() ?? null, filter.estimateHeight ?? 340);
            if (!next) throw new Error('Finish or discard an open editor, or move away from the current posts, then retry.');
            commit(next); setError('');
        } catch (cause) {
            if (stillCurrent()) setError(cause instanceof Error ? cause.message : 'Could not load more discussions.');
        } finally {
            // Object identity, not just the filter key: an older finally cannot clear a newer request.
            if (stillCurrent()) { request.current = null; setLoading(false); }
        }
    }, [ready, error, filter.tab, filter.topic, filter.search, filter.context, filter.bounded, filter.estimateHeight, commit]);
    const loadMore = useCallback(() => { void load('next'); }, [load]);
    const loadPrevious = useCallback(() => { if (filter.bounded) void load('previous'); }, [load, filter.bounded]);
    const removeItem = useCallback((id: number) => {
        if (scope.current.key !== key || scope.current.initial !== initial) return;
        commit(removeFromWindow(current.current, id, viewport.current?.().anchor ?? null));
    }, [commit, key, initial]);
    const updateItem = useCallback((id: number, change: Partial<T> | ((post: T) => Partial<T>)) => {
        if (scope.current.key !== key || scope.current.initial !== initial) return;
        const previous = current.current; const post = previous.entities.get(id); if (!post) return;
        const entities = new Map(previous.entities); entities.set(id, { ...post, ...(typeof change === 'function' ? change(post) : change) });
        commit({ ...previous, entities });
    }, [commit, key, initial]);
    const shown = ready ? state : initialWindow(initial);
    const items = useMemo(() => shown.batches.flatMap(b => b.ids.flatMap(id => { const item = shown.entities.get(id); return item ? [item] : []; })), [shown]);
    return { items, loadMore, loadPrevious, viewport, topPx: shown.topPx, bottomPx: shown.bottomPx, anchor: shown.anchor,
        loading: ready && loading, error: ready ? error : '', hasMore: edge(shown, 'next') !== null,
        hasPrevious: Boolean(filter.bounded && edge(shown, 'previous')), restart,
        retry: () => { if (restart) router.reload(); else void load(failedDirection.current, true); }, updateItem, removeItem };
}
