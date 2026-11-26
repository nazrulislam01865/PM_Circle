import { Link } from '@inertiajs/react';
import type { MemberCrumb } from './memberBreadcrumbs';

export function MemberBreadcrumb({ items }: { items: readonly MemberCrumb[] }) {
    if (!items.length) return null;
    return <nav className="pm-member-breadcrumb" aria-label="Breadcrumb">
        <ol>{items.map((item, index) => {
            const last = index === items.length - 1;
            return <li key={`${index}-${item.label}`}>
                {index > 0 && <span className="pm-member-breadcrumb-separator" aria-hidden="true">/</span>}
                {!last && item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
            </li>;
        })}</ol>
    </nav>;
}
