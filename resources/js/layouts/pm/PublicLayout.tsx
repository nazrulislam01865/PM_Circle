import { Link, usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

type AuthProps = { auth: { user: { name: string; onboarding_step: number } | null }; memberShell: DashboardShellData | null };
export function PublicLayout({ children, active, joinLabel = 'Join the community' }: { children: ReactNode; active?: string; joinLabel?: string }) {
    const { auth, memberShell } = usePage<AuthProps>().props;
    const [open, setOpen] = useState(false);
    const links = [{ href: '/community', label: 'Discussions' }, { href: '/learning', label: 'Learn & Practice' }, { href: '/careers', label: 'Careers' }, { href: '/members', label: 'Members' }];
    // The guest prototype remains intact; signed-in members use exactly one shared app shell.
    if (auth?.user && memberShell && auth.user.onboarding_step >= 3) {
        return <MemberDashboardLayout dashboard={memberShell}><div className="pm-member-public-content">{children}</div></MemberDashboardLayout>;
    }
    return <div className="pm-app">
        <header className="pm-header"><div className="pm-container pm-header-inner">
            <Brand small />
            <nav className={open ? 'pm-main-nav is-open' : 'pm-main-nav'} aria-label="Main navigation">
                {links.map(link => <Link onClick={() => setOpen(false)} key={link.href} href={link.href} className={active === link.href ? 'active' : ''}>{link.label}</Link>)}
            </nav>
            <div className="pm-header-actions">{auth?.user ? <Link href="/dashboard" className="pm-text-link">Dashboard</Link> : <Link href="/login" className="pm-text-link">Log in</Link>}
                <Link href={auth?.user ? '/dashboard' : '/register'} className="pm-button pm-button-sm">{auth?.user ? 'My community' : joinLabel}</Link>
            </div><button className="pm-mobile-toggle" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={23} /> : <Menu size={23} />}</button>
        </div></header>
        <main>{children}</main>
        <footer className="pm-footer"><div className="pm-container pm-footer-inner"><Brand small /><nav aria-label="Footer"><Link href="/about">About</Link><Link href="/community">Community guidelines</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav><p>Building better project professionals together.</p></div></footer>
    </div>;
}
