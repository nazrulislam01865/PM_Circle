import { Link, usePage } from '@inertiajs/react';
import { Bookmark, BookOpen, BriefcaseBusiness, ChartNoAxesColumnIncreasing, ChevronsLeft, ChevronsRight, ChevronRight, Crown, Home, LockKeyhole, Settings, Trophy, UserRound, UsersRound, RefreshCcw, ClipboardList } from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardShellData } from '@/types/dashboard';

type Item = { label: string; href: string; icon: typeof Home; requires?: 'plus' | 'pro' };
const primaryItems: Item[] = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'My profile', href: '/settings/profile', icon: UserRound },
    { label: 'Learn & practice', href: '/learning', icon: BookOpen },
    { label: 'PMP Exam Simulator', href: '/dashboard/features/pmp', icon: ClipboardList, requires: 'plus' },
    { label: 'Scrum / CSM Simulator', href: '/dashboard/features/scrum', icon: RefreshCcw, requires: 'plus' },
    { label: 'Project Simulator', href: '/dashboard/features/simulations', icon: ChartNoAxesColumnIncreasing, requires: 'pro' },
];
const secondaryItems: Item[] = [
    { label: 'Achievements', href: '/dashboard/features/achievements', icon: Trophy },
    { label: 'Community', href: '/community', icon: UsersRound },
    { label: 'Saved posts', href: '/saved-posts', icon: Bookmark },
    { label: 'Jobs & resume', href: '/careers', icon: BriefcaseBusiness },
    { label: 'Profile insights', href: '/dashboard/features/insights', icon: ChartNoAxesColumnIncreasing },
    { label: 'Settings', href: '/settings/profile', icon: Settings },
];

export function DashboardSidebar({ dashboard, open, close, collapsed, onToggle }: { dashboard: DashboardShellData; open: boolean; close: () => void; collapsed: boolean; onToggle: () => void }) {
    const activePath = usePage().url.split('?')[0];
    const paid = dashboard.plan !== 'free';
    const label = dashboard.plan === 'free' ? 'Free member' : `${dashboard.plan === 'premium' ? 'Premium' : 'Pro'} member`;
    const isCurrent = (href: string) => href === '/dashboard' ? activePath === href
        : href === '/learning' ? activePath.startsWith(href)
        : href === '/settings/profile' ? activePath.startsWith('/settings')
        : href === '/community' ? activePath === href || activePath.startsWith('/posts/') || activePath.startsWith('/scenarios/')
        : activePath === href;
    const items = (list: Item[]) => list.map(item => {
        const Icon = item.icon;
        const locked = item.requires === 'pro' ? dashboard.plan !== 'pro' : item.requires === 'plus' && !paid;
        return <Link key={item.label} href={locked ? '/membership' : item.href} onClick={close}
            className={`pm-dash-nav-link ${isCurrent(item.href) ? 'is-active' : ''}`} title={item.label}
            aria-current={isCurrent(item.href) ? 'page' : undefined}>
            <Icon size={23} strokeWidth={2} aria-hidden="true" /><span>{item.label}</span>
            {locked && <LockKeyhole className="pm-dash-nav-lock" size={15} aria-label="Requires paid membership" />}
        </Link>;
    });
    return <>
        {open && <button type="button" className="pm-dash-scrim" aria-label="Close navigation" onClick={close} />}
        <aside className={`pm-dash-sidebar ${open ? 'is-open' : ''} ${collapsed && !open ? 'is-collapsed' : ''}`} aria-label="Member navigation">
            <div className="pm-dash-side-logo"><Brand /><button className="pm-dash-sidebar-close" type="button" onClick={onToggle} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <ChevronsRight size={22}/> : <ChevronsLeft size={22}/>}</button><button className="pm-dash-drawer-close" type="button" onClick={close} aria-label="Close navigation">×</button></div>
            <nav className="pm-dash-sidebar-links" aria-label="Dashboard sections">{items(primaryItems)}<div className="pm-dash-nav-divider" />{items(secondaryItems)}</nav>
            <div className="pm-dash-side-bottom">
                <Link href="/settings/profile" className="pm-dash-side-member" onClick={close}><DashboardAvatar name={dashboard.member.name} size={54} demo={dashboard.isDemo}/><span><strong>{dashboard.member.name}</strong><small>{paid && <Crown size={13} fill="#ffb428" color="#ffb428"/>}{label}</small></span><ChevronRight size={19}/></Link>
                <Link className="pm-dash-plan-link" href="/membership" onClick={close}>{paid ? <Settings size={21}/> : <Crown size={21}/>} {paid ? 'Manage plan' : 'Compare plans'}</Link>
            </div>
        </aside>
    </>;
}
