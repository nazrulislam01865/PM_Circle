import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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
        const observer = new ResizeObserver(entries => {
            for (const entry of entries) onMeasure(id, index, entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [id, index, onMeasure]);
    return <div ref={reference} className="pm-virtual-feed-item" onFocusCapture={() => onFocus(id)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onBlur(id); }}>
        {children}
    </div>;
}

/** Window-scroll virtualization with measured variable-height posts and no inner scrollbar. */
export function VirtualizedFeed<T extends Keyed>({ items, renderItem, onNearEnd, estimateHeight = 340, className = '', enabled = true }: Props<T>) {
    const container = useRef<HTMLDivElement>(null);
    const heights = useRef(new Map<number, number>());
    const [measurementRevision, setMeasurementRevision] = useState(0);
    const [view, setView] = useState({ first: 0, last: 0 });
    const [focused, setFocused] = useState<number | null>(null);
    const firstVisible = useRef(0);
    const frame = useRef<number | null>(null);

    const offsets = useMemo(() => {
        const result = [0];
        for (const item of items) result.push(result[result.length - 1] + (heights.current.get(item.id) ?? estimateHeight));
        return result;
        // The measurements map is mutable; the revision triggers the next prefix-sum build.
    }, [items, estimateHeight, measurementRevision]);

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
        if (!Number.isFinite(height) || height <= 0) return;
        const current = heights.current.get(id) ?? estimateHeight;
        if (Math.abs(current - height) < 1) return;
        heights.current.set(id, height);
        // Preserve first visible post and its pixel offset when a previous card changes height.
        if (index < firstVisible.current) window.scrollBy(0, height - current);
        setMeasurementRevision(previous => previous + 1);
    }, [estimateHeight]);

    const activeEnd = Math.min(items.length - 1, Math.max(view.first + ACTIVE - 1, view.last));
    const nearEnd = items.length > 0 && items.length - 1 - activeEnd <= PREFETCH_THRESHOLD;
    useEffect(() => { if (nearEnd) onNearEnd(); }, [nearEnd, activeEnd, onNearEnd]);

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
    if (offsets[items.length] > previousEnd) {
        blocks.push(<div key="space-after" aria-hidden="true" style={{ height: offsets[items.length] - previousEnd }} />);
    }

    return <div ref={container} className={`pm-virtual-feed ${className}`}>{blocks}</div>;
}
