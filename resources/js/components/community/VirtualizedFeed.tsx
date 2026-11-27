import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';

import type { Viewport } from '@/hooks/community/feedWindow';

const ACTIVE = 12;
const OVERSCAN = 4;
const PREFETCH_THRESHOLD = 6;

type Keyed = { id: number };
type Props<T extends Keyed> = {
    items: T[];
    renderItem: (post: T, index: number) => ReactNode;
    onNearEnd: () => void;
    estimateHeight?: number;
    className?: string;
    enabled?: boolean;
    onNearStart?: () => void;
    topPx?: number;
    bottomPx?: number;
    anchor?: Viewport['anchor'];
    viewport?: RefObject<(() => Viewport) | null>;
};

function upperBound(values: number[], target: number): number {
    let lo = 0;
    let hi = values.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (values[mid] <= target) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

function MeasuredCard({ id, index, onMeasure, onFocus, onBlur, children }: {
    id: number;
    index: number;
    onMeasure: (id: number, index: number, height: number) => void;
    onFocus: (id: number) => void;
    onBlur: (id: number) => void;
    children: ReactNode;
}) {
    const reference = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const node = reference.current;
        if (!node) return;
        if (typeof ResizeObserver === 'undefined') {
            onMeasure(id, index, node.getBoundingClientRect().height);
            return;
        }
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) onMeasure(id, index, entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [id, index, onMeasure]);
    return <div ref={reference} className="pm-virtual-feed-item" data-feed-id={id} onFocusCapture={() => onFocus(id)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur(id); }}>
        {children}
    </div>;
}

/** Window-scroll virtualization with measured variable-height posts and no inner scrollbar. */
export function VirtualizedFeed<T extends Keyed>({ items, renderItem, onNearEnd, estimateHeight = 340, className = '', enabled = true, onNearStart, topPx = 0, bottomPx = 0, anchor, viewport }: Props<T>) {
    const container = useRef<HTMLDivElement>(null);
    const heights = useRef(new Map<number, number>());
    const [measurementRevision, setMeasurementRevision] = useState(0);
    const [view, setView] = useState({ first: 0, last: 0 });
    const [focused, setFocused] = useState<number | null>(null);
    const firstVisible = useRef(0);
    const [pinned, setPinned] = useState<number[]>([]);
    const measureFrame = useRef<number | null>(null);
    const adjustment = useRef(0);
    const activeItems = useRef(items);
    activeItems.current = items;
    // Remove measurements for every evicted/deleted payload.
    useLayoutEffect(() => {
        const retained = new Set(items.map(post => post.id));
        for (const id of heights.current.keys()) if (!retained.has(id)) heights.current.delete(id);
    }, [items]);
    const getPinned = useCallback(() => Array.from(container.current?.querySelectorAll<HTMLElement>('[data-feed-id]') ?? [])
        .filter(node => node.contains(document.activeElement) || node.querySelector('[data-feed-pin="true"]'))
        .map(node => Number(node.dataset.feedId)), []);
    useLayoutEffect(() => {
        if (!viewport || !container.current) return;
        const sync = () => {
            const ids = getPinned();
            setPinned(previous => previous.length === ids.length && previous.every((id, index) => id === ids[index]) ? previous : ids);
        };
        const observer = new MutationObserver(sync);
        observer.observe(container.current, { subtree: true, attributes: true, attributeFilter: ['data-feed-pin'], childList: true });
        return () => observer.disconnect();
    }, [viewport, getPinned]);
    const frame = useRef<number | null>(null);

    const offsets = useMemo(() => {
        const result = [topPx];
        for (const item of items) result.push(result[result.length - 1] + (heights.current.get(item.id) ?? estimateHeight));
        return result;
        // The measurements map is mutable; the revision triggers the next prefix-sum build.
    }, [items, estimateHeight, measurementRevision, topPx]);

    const calculate = useCallback(() => {
        const element = container.current;
        if (!element || items.length === 0) return;
        const top = window.scrollY + element.getBoundingClientRect().top;
        const start = Math.max(0, window.scrollY - top);
        const end = Math.max(0, window.scrollY + window.innerHeight - top);
        const first = Math.min(items.length - 1, Math.max(0, upperBound(offsets, start) - 1));
        const last = Math.min(items.length - 1, Math.max(first, upperBound(offsets, end) - 1));
        firstVisible.current = first;
        setView(previous => previous.first === first && previous.last === last ? previous : { first, last });
    }, [items.length, offsets]);

    useLayoutEffect(() => {
        if (!viewport) return;
        viewport.current = () => {
            const element = container.current;
            const start = Math.max(0, -(element?.getBoundingClientRect().top ?? 0));
            const first = Math.min(items.length - 1, Math.max(0, upperBound(offsets, start) - 1));
            const last = Math.min(items.length - 1, Math.max(first, upperBound(offsets, start + window.innerHeight) - 1));
            const protectedIds = new Set([...items.slice(Math.max(0, first - OVERSCAN), last + OVERSCAN + 1).map(post => post.id), ...getPinned()]);
            const id = items[first]?.id;
            return { protectedIds, heights: heights.current, anchor: id === undefined ? null : { id, offsetPx: (element?.getBoundingClientRect().top ?? 0) + offsets[first] } };
        };
        return () => { viewport.current = null; };
    }, [viewport, items, offsets, getPinned]);

    // Restore the measured visible anchor after a batch is prepended/evicted.
    useLayoutEffect(() => {
        if (!anchor || !container.current) return;
        const index = items.findIndex(post => post.id === anchor.id);
        if (index < 0) return;
        const current = container.current.getBoundingClientRect().top + offsets[index];
        if (Math.abs(current - anchor.offsetPx) > 1) window.scrollBy(0, current - anchor.offsetPx);
        // Only restore on a new structural commit, not on every subsequent measurement.
    }, [anchor]);

    useLayoutEffect(() => {
        calculate();
        const onScroll = () => {
            if (frame.current !== null) return;
            frame.current = window.requestAnimationFrame(() => {
                frame.current = null;
                calculate();
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame.current !== null) cancelAnimationFrame(frame.current);
            frame.current = null;
        };
    }, [calculate]);

    const onMeasure = useCallback((id: number, index: number, height: number) => {
        if (!Number.isFinite(height) || height <= 0 || activeItems.current[index]?.id !== id) return;
        const current = heights.current.get(id) ?? estimateHeight;
        if (Math.abs(current - height) < 1) return;
        heights.current.set(id, height);
        // Preserve first visible post and its pixel offset when a previous card changes height.
        if (index < firstVisible.current) adjustment.current += height - current;
        if (measureFrame.current === null) measureFrame.current = requestAnimationFrame(() => {
            measureFrame.current = null;
            if (adjustment.current) window.scrollBy(0, adjustment.current);
            adjustment.current = 0;
            setMeasurementRevision(previous => previous + 1);
        });
    }, [estimateHeight]);

    useEffect(() => () => { if (measureFrame.current !== null) cancelAnimationFrame(measureFrame.current); }, []);
    const activeEnd = Math.min(items.length - 1, Math.max(view.first + ACTIVE - 1, view.last));
    const nearEnd = items.length > 0 && items.length - 1 - activeEnd <= PREFETCH_THRESHOLD;
    // Prefer the edge the reader is approaching; one request is enforced by the hook.
    const nearStart = Boolean(onNearStart && view.first <= PREFETCH_THRESHOLD);
    useEffect(() => { if (nearStart) onNearStart?.(); else if (nearEnd) onNearEnd(); }, [nearStart, nearEnd, activeEnd, onNearStart, onNearEnd]);

    if (!items.length) return null;
    if (!enabled) {
        return <div className={className}>{items.map((post, index) => <div key={post.id}>{renderItem(post, index)}</div>)}</div>;
    }

    const first = Math.max(0, view.first - OVERSCAN);
    const last = Math.min(items.length - 1, Math.max(activeEnd, view.last) + OVERSCAN);
    const indices = Array.from({ length: last - first + 1 }, (_, index) => first + index);
    // A focused reply/editor must not unmount even during a fast scroll.
    if (focused !== null) {
        const pinned = items.findIndex(post => post.id === focused);
        if (pinned !== -1 && (pinned < first || pinned > last)) indices.push(pinned);
    }
    if (viewport) for (const id of pinned) {
        const index = items.findIndex(post => post.id === id);
        if (index >= 0 && !indices.includes(index)) indices.push(index);
    }
    indices.sort((a, b) => a - b);
    const blocks: ReactNode[] = [];
    let previousEnd = 0;
    for (const index of indices) {
        const padding = Math.max(0, offsets[index] - previousEnd);
        if (padding > 0) blocks.push(<div key={`space-${index}`} aria-hidden="true" style={{ height: padding }} />);
        const post = items[index];
        blocks.push(<MeasuredCard key={post.id} id={post.id} index={index}
            onMeasure={onMeasure} onFocus={setFocused} onBlur={id => setFocused(current => current === id ? null : current)}>
            {renderItem(post, index)}
        </MeasuredCard>);
        previousEnd = offsets[index + 1];
    }
    if (offsets[items.length] + bottomPx > previousEnd) {
        blocks.push(<div key="space-after" aria-hidden="true" style={{ height: offsets[items.length] + bottomPx - previousEnd }} />);
    }

    return <div ref={container} className={`pm-virtual-feed ${className}`}>{blocks}</div>;
}
