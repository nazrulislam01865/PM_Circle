import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';

const navigation = [
    { href: '/daily-challenge', label: 'Daily Challenge' },
    { href: '/community', label: 'Community Feed' },
    { href: '/learning', label: 'Learn & Practice' },
    { href: '/careers', label: 'Careers' },
    { href: '/members', label: 'Members' },
];

type HeaderProps = {
    active?: string;
    joinLabel?: string;
    actions?: ReactNode;
    /** Keep the sidebar as the only desktop brand in the member shell. */
    brandPlacement?: 'always' | 'mobile';
};

/** The homepage navigation is shared by the public, authentication and member shells. */
export function SiteHeader({ active, joinLabel = 'Join the community', actions, brandPlacement = 'always' }: HeaderProps) {
    const page = usePage<{ auth?: { user: { onboarding_step?: number } | null } }>();
    const [open, setOpen] = useState(false);
    const pathname = page.url.split('?')[0].split('#')[0];
    const user = page.props.auth?.user;
    const isActive = (href: string) => {
        if (active) return href === active;
        return pathname === href ||
            (href === '/daily-challenge' && pathname.startsWith('/scenarios/')) ||
            (href === '/community' && pathname.startsWith('/posts/')) ||
            (href === '/learning' && pathname.startsWith('/learning/')) ||
            (href === '/careers' && pathname.startsWith('/careers/')) ||
            (href === '/members' && pathname.startsWith('/members/'));
    };

    return <header className="pm-header pm-site-header">
        <div className="pm-container pm-header-inner">
            {brandPlacement === 'always' ? <Brand small /> : <span className="pm-member-mobile-brand"><Brand small /></span>}
            <nav id="pm-site-navigation" className={`pm-main-nav${open ? ' is-open' : ''}`} aria-label="Main navigation">
                {navigation.map(item => <Link key={item.href} href={item.href}
                    className={isActive(item.href) ? 'active' : ''}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={() => setOpen(false)}>{item.label}</Link>)}
            </nav>
            {actions ? <div className="pm-header-actions pm-site-member-actions">{actions}</div>
                : <div className="pm-header-actions">
                    {user ? <Link className="pm-text-link" href="/dashboard">Dashboard</Link>
                        : <Link className="pm-text-link" href="/login">Log in</Link>}
                    <Link className="pm-button pm-button-sm" href={user ? '/dashboard' : '/register'}>{user ? 'My community' : joinLabel}</Link>
                </div>}
            <button className="pm-mobile-toggle" type="button"
                aria-label={open ? 'Close main menu' : 'Open main menu'}
                aria-controls="pm-site-navigation" aria-expanded={open}
                onClick={() => setOpen(value => !value)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
    </header>;
}
