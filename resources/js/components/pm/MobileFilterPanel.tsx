import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

/** Desktop keeps the original filter panel; phones can reveal it on demand. */
export function MobileFilterPanel({ className, label, activeCount = 0, children }: {
    className: string; label: string; activeCount?: number; children: ReactNode;
}) {
    const [expanded, setExpanded] = useState(false);
    const id = useId();
    return <aside className={`${className} pm-responsive-filter-panel`} aria-label={label} data-mobile-expanded={expanded}>
        <button type="button" className="pm-mobile-filter-toggle" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
            <SlidersHorizontal size={19} aria-hidden="true"/><span>{label}{activeCount > 0 ? ` (${activeCount})` : ''}</span><ChevronDown size={18} aria-hidden="true"/>
        </button>
        <div id={id} className="pm-mobile-filter-content">{children}</div>
    </aside>;
}
