import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';

export function HomeSectionTitle({ id, title, description, action, href }: {
    id: string; title: string; description?: string; action?: string; href?: string;
}) {
    return <div className="pm-v2-section-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>
        {action && href && <Link href={href} className="pm-v2-text-link">{action}</Link>}</div>;
}

export function HomeAction({ children, href, primary = false, className = '' }: {
    children: ReactNode; href: string; primary?: boolean; className?: string;
}) {
    return <Link href={href} className={`pm-v2-button ${primary ? 'pm-v2-button-primary' : ''} ${className}`.trim()}>{children}</Link>;
}

export function HomeCarouselControls({ label, previous, next }: {
    label: string; previous: () => void; next: () => void;
}) {
    return <div className="pm-v2-arrows"><button type="button" onClick={previous} aria-label={`Previous ${label}`}><ChevronLeft aria-hidden="true"/></button>
        <button type="button" onClick={next} aria-label={`Next ${label}`}><ChevronRight aria-hidden="true"/></button></div>;
}

export function moveCard(scroller: RefObject<HTMLDivElement | null>, direction: number): void {
    const node = scroller.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>('[data-home-card]');
    const step = (card?.getBoundingClientRect().width ?? 260) + 14;
    const max = node.scrollWidth - node.clientWidth;
    const target = direction > 0 && node.scrollLeft >= max - 4 ? 0 :
        direction < 0 && node.scrollLeft <= 4 ? max : node.scrollLeft + direction * step;
    node.scrollTo({ left: target, behavior: 'smooth' });
}
