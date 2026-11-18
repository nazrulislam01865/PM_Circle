import { Link, usePage } from '@inertiajs/react';
import { memberNavigationForUrl } from '@/components/dashboard/memberNavigation';

/** The second, text-only navigation row below the authenticated primary header.
 * In-page tabs (post scopes, scenario filters and PMP views) remain the third layer. */
export function MemberSecondaryNavigation() {
    const { url } = usePage();
    const { section, active, secondary } = memberNavigationForUrl(url);

    return <nav className="pm-member-secondary" aria-label={`${section} navigation`}>
        <div className="pm-member-secondary-inner">
            {secondary.map(item => item.disabled
                ? <span key={item.id} className="pm-member-secondary-item is-disabled" aria-disabled="true" title="Coming soon">{item.label}</span>
                : <Link key={item.id} href={item.href} preserveScroll={false}
                    className={`pm-member-secondary-item${active === item.id ? ' is-active' : ''}`}
                    aria-current={active === item.id ? 'page' : undefined}>{item.label}</Link>)}
        </div>
    </nav>;
}
