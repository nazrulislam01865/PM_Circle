import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { paginationWindow } from '@/lib/pagination-window';

type PageControlProps = { label: string; children: ReactNode; active?: boolean; href?: string | null; onClick?: () => void; preserveState?: boolean };
function PageControl({ label, children, active = false, href, onClick, preserveState }: PageControlProps) {
    const className = 'pm-guide-button is-outline pm-pagination-control';
    if (href) return <Link href={href} className={className} aria-label={label} aria-current={active ? 'page' : undefined} preserveScroll preserveState={preserveState}>{children}</Link>;
    return <button type="button" className={className} aria-label={label} aria-current={active ? 'page' : undefined} disabled={!onClick} onClick={onClick}>{children}</button>;
}

/** Same buttons, current state and accessible navigation for client and server pagination. */
export function Pagination({ current, last, label, onPageChange }: { current: number; last: number; label: string; onPageChange: (page: number) => void }) {
    if (last <= 1) return null;
    const action = (page: number) => page >= 1 && page <= last ? { onClick: () => onPageChange(page) } : {};
    return <nav className="pm-pagination" aria-label={label}>
        <PageControl label="Previous page" {...action(current - 1)}><ChevronLeft aria-hidden="true" size={18}/></PageControl>
        {paginationWindow(current, last).map((page, i) => page === '…' ? <span className="pm-pagination-gap" key={`gap-${i}`} aria-hidden="true">…</span> : <PageControl key={page} label={`Page ${page}`} active={page === current} {...action(page)}>{page}</PageControl>)}
        <PageControl label="Next page" {...action(current + 1)}><ChevronRight aria-hidden="true" size={18}/></PageControl>
    </nav>;
}

export function AdjacentPagination({ previous, next, label, current, nextLabel = 'Next page' }: { previous?: string | null; next?: string | null; label: string; current?: number; nextLabel?: string }) {
    if (!previous && !next) return null;
    return <nav className="pm-pagination" aria-label={label}>
        <PageControl label="Previous page" href={previous}><ChevronLeft aria-hidden="true" size={18}/></PageControl>
        {current !== undefined && <span className="pm-pagination-position">Page {current}</span>}
        <PageControl label={nextLabel} href={next}><ChevronRight aria-hidden="true" size={18}/></PageControl>
    </nav>;
}

export function LinkedPagination({ links, label, preserveState = false }: { links: { url: string | null; label: string; active: boolean }[]; label: string; preserveState?: boolean }) {
    if (links.length <= 3) return null;
    return <nav className="pm-pagination" aria-label={label}>{links.map((link, i) => {
        const text = link.label.replace(/&laquo;|&raquo;/g, '').trim();
        if (text === '...') return <span key={i} className="pm-pagination-gap" aria-hidden="true">…</span>;
        const previous = i === 0;
        const next = i === links.length - 1;
        return <PageControl key={i} label={previous ? 'Previous page' : next ? 'Next page' : `Page ${text}`} href={link.url} active={link.active} preserveState={preserveState}>{previous ? <ChevronLeft aria-hidden="true" size={18}/> : next ? <ChevronRight aria-hidden="true" size={18}/> : text}</PageControl>;
    })}</nav>;
}
