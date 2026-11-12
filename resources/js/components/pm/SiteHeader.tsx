import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';
import { MemberHomeHeader } from '@/components/dashboard/MemberHomeHeader';

const fallbackNavigation = [
    { href: '/daily-challenge', label: 'Daily Challenge' },
    { href: '/community', label: 'Community Feed' },
    { href: '/learning', label: 'Learn & Practice' },
    { href: '/careers', label: 'Careers' },
    { href: '/members', label: 'Members' },
    { href: '/pm-trends', label: 'PM Trends' },
];

type HeaderProps = {
    active?: string;
    joinLabel?: string;
    actions?: ReactNode;
    /** Keep the sidebar as the only desktop brand in the member shell. */
    brandPlacement?: 'always' | 'mobile';
    /** The authenticated home links the shared brand back to its own home route. */
    brandHref?: string;
};

/** The homepage navigation is shared by the public, authentication and member shells. */
export function SiteHeader({ active, joinLabel = 'Join the community', actions, brandPlacement = 'always', brandHref = '/' }: HeaderProps) {
    const page = usePage<{ auth?: { user: { onboarding_step?: number; is_admin?: boolean } | null }; siteNavigation?: { header: { href: string; label: string }[] } }>();
    const navigation = page.props.siteNavigation?.header ?? fallbackNavigation;
    const [open, setOpen] = useState(false);
    const pathname = page.url.split('?')[0].split('#')[0];
    const user = page.props.auth?.user;
    const workspace = user?.is_admin ? '/admin' : '/dashboard';
    // Public-facing pages should use the exact same header when a member is
    // signed in. Authentication data is already shared: no memberShell query.
    if (user && !user.is_admin && (user.onboarding_step ?? 0) >= 3) {
        return <MemberHomeHeader />;
    }
    const isActive = (href: string) => {
        if (active) return href === active;
        return pathname === href ||
            (href === '/daily-challenge' && pathname.startsWith('/scenarios/')) ||
            (href === '/community' && pathname.startsWith('/posts/')) ||
            (href === '/learning' && pathname.startsWith('/learning/')) ||
            (href === '/careers' && pathname.startsWith('/careers/')) ||
            (href === '/members' && pathname.startsWith('/members/')) ||
            (href === '/pm-trends' && pathname.startsWith('/pm-trends/'));
    };

    return <header className="pm-header pm-site-header">
        <div className="pm-container pm-header-inner">
            {brandPlacement === 'always' ? <Brand small href={brandHref} /> : <span className="pm-member-mobile-brand"><Brand small href={brandHref} /></span>}
            <nav id="pm-site-navigation" className={`pm-main-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
                {navigation.map(item => <Link key={item.href} href={item.href}
                    className={isActive(item.href) ? 'active' : ''}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={() => setOpen(false)}>{item.label}</Link>)}
            </nav>
            {actions ? <div className="pm-header-actions pm-site-member-actions">{actions}</div>
                : <div className="pm-header-actions">
                    {user ? <Link className="pm-text-link" href={workspace}>{user.is_admin ? 'Administration' : 'Dashboard'}</Link>
                        : <Link className="pm-text-link" href="/login">Log in</Link>}
                    <Link className="pm-button pm-button-sm" href={user ? workspace : '/register'}>{user ? (user.is_admin ? 'Admin panel' : 'My community') : joinLabel}</Link>
                </div>}
            <button className="pm-mobile-toggle" type="button"
                aria-label={open ? 'Close main menu' : 'Open main menu'}
                aria-controls="pm-site-navigation" aria-expanded={open}
                onClick={() => setOpen(value => !value)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
    </header>;
}
