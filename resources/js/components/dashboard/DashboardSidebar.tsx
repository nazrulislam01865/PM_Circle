import { Link, usePage } from '@inertiajs/react';
import { useState, type MouseEvent } from 'react';
import {
    Award, BarChart3, Bookmark, BookOpen, BriefcaseBusiness, CalendarDays,
    ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Crown, History,
    Home, LockKeyhole, MessagesSquare, Mic, Pencil, Settings, Sparkles,
    UserRound, UsersRound, X,
} from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import type { DashboardShellData } from '@/types/dashboard';

type NavItem = { label: string; href: string; icon: typeof Home; requires?: 'plus' | 'pro' };
type NavGroup = { title: string; items: NavItem[] };

/** One central, route-backed member navigation catalogue, not separate page menus. */
const groups: NavGroup[] = [
    { title: 'Profile & career', items: [
        { label: 'My profile', href: '/settings/profile', icon: UserRound },
        { label: 'Profile completion', href: '/settings/profile?tab=overview', icon: BarChart3 },
        { label: 'Edit profile', href: '/settings/profile?tab=edit', icon: Pencil },
        { label: 'AI Resume Assistant', href: '/dashboard/features/resume', icon: Sparkles },
        { label: 'Careers', href: '/careers', icon: BriefcaseBusiness },
        { label: 'Activity Log', href: '/activity-log', icon: History },
    ] },
    { title: 'Learn & practise', items: [
        { label: 'My learning', href: '/dashboard/learning', icon: BookOpen },
        { label: 'Courses', href: '/learning', icon: BookOpen },
        { label: 'Exam simulator', href: '/exams/pmp', icon: ClipboardList },
        { label: 'Scrum simulator', href: '/simulators/scrum', icon: ClipboardList },
        { label: 'Project simulator', href: '/simulators/project', icon: ClipboardList, requires: 'pro' },
        { label: 'Interview preparation', href: '/interview-preparation', icon: Mic },
    ] },
    { title: 'Community', items: [
        { label: 'Community feed', href: '/community', icon: MessagesSquare },
        { label: 'Members', href: '/members', icon: UsersRound },
        { label: 'Daily challenge', href: '/dashboard/daily-challenge', icon: CalendarDays },
        { label: 'Saved posts', href: '/saved-posts', icon: Bookmark },
        { label: 'Badges', href: '/dashboard/features/achievements', icon: Award },
    ] },
    { title: 'Account', items: [
        { label: 'Settings', href: '/settings/security', icon: Settings },
        { label: 'Membership', href: '/membership', icon: Crown },
    ] },
];

export function DashboardSidebar({ dashboard, open, close, collapsed, onToggle }: {
    dashboard: DashboardShellData;
    open: boolean;
    close: () => void;
    collapsed: boolean;
    onToggle: () => void;
}) {
    // Keep every submenu visible on first render, while allowing manual collapse.
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(groups.map(group => [group.title, true])),
    );
    const toggleGroup = (event: MouseEvent<HTMLElement>, title: string) => {
        event.preventDefault();
        setExpandedGroups(previous => ({ ...previous, [title]: !previous[title] }));
    };
    const url = usePage().url;
    const currentPath = url.split('?')[0];
    const plan = dashboard.plan;
    const isActive = (href: string) => {
        const [path, query] = href.split('?');
        if (path === '/dashboard') return currentPath === '/dashboard';
        if (path === '/settings/profile') return currentPath === path && (query ? url.includes(query) : !url.includes('tab='));
        if (path === '/dashboard/learning') return currentPath.startsWith('/dashboard/learning');
        if (path === '/learning') return currentPath === '/learning' || currentPath.startsWith('/learning/');
        if (path === '/community') return currentPath === path || currentPath.startsWith('/posts/');
        if (path === '/exams/pmp') return currentPath.startsWith(path);
        if (path === '/settings/security') return currentPath.startsWith('/settings/security') || currentPath.startsWith('/settings/appearance');
        return currentPath === path || currentPath.startsWith(`${path}/`);
    };
    const renderItem = (item: NavItem) => {
        const Icon = item.icon;
        const locked = item.requires === 'pro' && plan !== 'pro' || item.requires === 'plus' && plan === 'free';
        const active = isActive(item.href);
        return <Link key={`${item.href}-${item.label}`} href={locked ? '/membership' : item.href} onClick={close}
            className={`pm-dash-nav-link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} title={item.label}>
            <Icon size={20} strokeWidth={1.9} aria-hidden="true"/><span>{item.label}</span>
            {locked && <LockKeyhole className="pm-dash-nav-lock" size={14} aria-label="Requires membership"/>}
        </Link>;
    };
    return <>
        {open && <button className="pm-dash-scrim" type="button" aria-label="Close member navigation" onClick={close}/>}
        <aside id="pm-member-sidebar" className={`pm-dash-sidebar pm-member-restored-sidebar${open ? ' is-open' : ''}${collapsed && !open ? ' is-collapsed' : ''}`} aria-label="Member navigation">
            <div className="pm-dash-side-logo">
                <Brand href="/dashboard"/>
                <button type="button" className="pm-dash-sidebar-close" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={onToggle}>
                    {collapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
                </button>
                <button type="button" className="pm-dash-drawer-close" aria-label="Close navigation" onClick={close}><X size={22}/></button>
            </div>
            <nav className="pm-dash-sidebar-links" aria-label="Member sections">
                {renderItem({ label: 'Home', href: '/dashboard', icon: Home })}
                {groups.map(group => <details className="pm-member-sidebar-group" key={group.title} open={expandedGroups[group.title]}>
                    <summary onClick={event => toggleGroup(event, group.title)}><span>{group.title}</span><ChevronDown size={16} aria-hidden="true"/></summary>
                    <div className="pm-member-sidebar-submenu">{group.items.map(renderItem)}</div>
                </details>)}
            </nav>
        </aside>
    </>;
}
