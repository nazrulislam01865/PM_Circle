import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    BriefcaseBusiness,
    CalendarCheck2,
    ChartNoAxesColumnIncreasing,
    ChevronDown,
    CircleHelp,
    ClipboardCheck,
    Headphones,
    Home,
    Mail,
    Menu,
    MessagesSquare,
    Monitor,
    Newspaper,
    UsersRound,
    X,
} from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Brand } from '@/components/pm/Brand';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import type { DashboardShellData } from '@/types/dashboard';

type NavigationLink = { href: string; label: string };

const defaultLinks: NavigationLink[] = [
    { href: '/daily-challenge', label: 'Daily Challenge' },
    { href: '/community', label: 'Community Feed' },
    { href: '/learning', label: 'Learn & Practice' },
    { href: '/careers', label: 'Careers' },
    { href: '/members', label: 'Members' },
];

const memberPath = (href: string) => ({
    '/daily-challenge': '/dashboard/daily-challenge',
    '/community': '/community',
    '/learning': '/dashboard/learning',
}[href] ?? href);

/** The one navigation header used by guest, authentication and member pages. */
export function MemberHomeHeader({ dashboard, active, actions, brandHref, joinLabel = 'Join the community' }: {
    dashboard?: DashboardShellData;
    active?: string;
    actions?: ReactNode;
    brandHref?: string;
    joinLabel?: string;
}) {
    const page = usePage<{
        auth?: { user?: { name: string; avatar_path?: string | null; onboarding_step?: number; is_admin?: boolean } | null };
        siteNavigation?: { header?: NavigationLink[] };
    }>();
    const [mobileOpen, setMobileOpen] = useState(false);
    const configured = page.props.siteNavigation?.header ?? defaultLinks;
    const links = configured.filter(entry => defaultLinks.some(item => item.href === entry.href));
    const item = (href: string) => links.find(link => link.href === href);
    const daily = item('/daily-challenge');
    const community = item('/community');
    const learning = item('/learning');
    const careers = item('/careers');
    const members = item('/members');
    const close = () => setMobileOpen(false);
    const closeDropdown = (event: MouseEvent) => {
        close();
        event.currentTarget.closest('details')?.removeAttribute('open');
    };
    const user = page.props.auth?.user;
    const isMember = Boolean(user && !user.is_admin && (user.onboarding_step ?? 0) >= 3);
    const pathname = active ?? page.url.split('?')[0].split('#')[0];
    const isHome = pathname === '/dashboard' || pathname === '/';
    const isDaily = pathname.startsWith('/dashboard/daily-challenge') || pathname === '/daily-challenge' || pathname.startsWith('/scenarios/');
    const isCommunity = pathname === '/community' || pathname.startsWith('/posts/');
    const isExam = pathname.startsWith('/exam-simulator/') || pathname.startsWith('/exams/') || pathname.startsWith('/simulators/scrum');
    const isLearning = !isExam && (pathname.startsWith('/dashboard/learning') || pathname === '/learning' || pathname.startsWith('/learning/') || pathname.startsWith('/interview-preparation') || pathname.startsWith('/simulators/project'));
    const isCareers = pathname.startsWith('/careers') || pathname.startsWith('/dashboard/features/career');
    const isMembers = pathname === '/members' || pathname.startsWith('/members/');
    const name = dashboard?.member.name ?? user?.name ?? 'Member';
    const avatar = dashboard?.member.avatar_path ?? user?.avatar_path;
    const isDemo = dashboard?.isDemo ?? false;
    const navClass = (current: boolean) => `pm-member-home-nav-link${current ? ' is-active' : ''}`;
    const closeOnEscape = (event: KeyboardEvent<HTMLDetailsElement>) => {
        if (event.key === 'Escape') {
            event.currentTarget.open = false;
            event.currentTarget.querySelector('summary')?.focus();
        }
    };

    return <header className={`pm-member-home-header pm-site-header${isMember ? '' : ' is-guest'}${!user ? ' has-guest-actions' : ''}`}>
        <div className="pm-member-home-header-inner">
            <div className="pm-member-home-brand"><Brand href={brandHref ?? (isMember ? '/dashboard' : '/')} /></div>
            <nav id="pm-member-home-navigation" className={`pm-member-home-nav${mobileOpen ? ' is-open' : ''}`} aria-label="Main navigation">
                <Link href={isMember ? '/dashboard' : '/'} className={navClass(isHome)} aria-current={isHome ? 'page' : undefined} onClick={close}>
                    <Home className="pm-nav-icon" aria-hidden="true"/>Home
                </Link>
                {daily && <Link className={navClass(isDaily)} aria-current={isDaily ? 'page' : undefined} href={isMember ? memberPath(daily.href) : daily.href} onClick={close}>
                    <CalendarCheck2 className="pm-nav-icon" aria-hidden="true"/>{daily.label}
                </Link>}
                {community && <Link className={navClass(isCommunity)} aria-current={isCommunity ? 'page' : undefined} href={isMember ? memberPath(community.href) : community.href} onClick={close}>
                    <MessagesSquare className="pm-nav-icon" aria-hidden="true"/>{community.label === 'Community Feed' ? 'Community' : community.label}
                </Link>}
                {learning && <details className="pm-member-home-nav-group" onKeyDown={closeOnEscape}>
                    <summary className={isLearning ? 'is-current' : undefined} aria-current={isLearning ? 'page' : undefined}>
                        <BookOpen className="pm-nav-icon" aria-hidden="true"/>{learning.label}<ChevronDown className="pm-nav-chevron" size={15} aria-hidden="true"/>
                    </summary>
                    <div className="pm-member-home-submenu">
                        <Link href={isMember ? '/dashboard/learning' : '/learning'} onClick={closeDropdown}><BookOpen aria-hidden="true"/>Course Library</Link>
                        <Link href={isMember ? '/dashboard/learning' : '/learning'} onClick={closeDropdown}><BookOpen aria-hidden="true"/>My Learning</Link>
                        <Link href="/simulators/project" onClick={closeDropdown}><ClipboardCheck aria-hidden="true"/>Project Simulator</Link>
                    </div>
                </details>}
                <details className="pm-member-home-nav-group pm-member-home-exam-group" onKeyDown={closeOnEscape}>
                    <summary className={isExam ? 'is-current' : undefined} aria-current={isExam ? 'page' : undefined}>
                        <ClipboardCheck className="pm-nav-icon" aria-hidden="true"/>Exam Simulator<ChevronDown className="pm-nav-chevron" size={15} aria-hidden="true"/>
                    </summary>
                    <div className="pm-member-home-submenu pm-member-home-exam-submenu">
                        <Link href={user && !user.is_admin ? '/exams/pmp/enter' : '/exam-simulator/pmp'} onClick={closeDropdown}><Monitor aria-hidden="true"/>PMP Exam Simulator</Link>
                        <Link href="/simulators/scrum" onClick={closeDropdown}><Headphones aria-hidden="true"/>Scrum Simulator</Link>
                        <span className="pm-member-home-disabled-item" aria-disabled="true" title="BA Simulator is coming soon"><ChartNoAxesColumnIncreasing aria-hidden="true"/>BA Simulator</span>
                    </div>
                </details>
                {careers && <details className="pm-member-home-nav-group" onKeyDown={closeOnEscape}>
                    <summary className={isCareers ? 'is-current' : undefined} aria-current={isCareers ? 'page' : undefined}>
                        <BriefcaseBusiness className="pm-nav-icon" aria-hidden="true"/>{careers.label}<ChevronDown className="pm-nav-chevron" size={15} aria-hidden="true"/>
                    </summary>
                    <div className="pm-member-home-submenu">
                        <Link href="/careers" onClick={closeDropdown}><BriefcaseBusiness aria-hidden="true"/>Browse Jobs</Link>
                        <Link href="/dashboard/features/career" onClick={closeDropdown}><BookOpen aria-hidden="true"/>Career Tools</Link>
                    </div>
                </details>}
                {members && <Link className={navClass(isMembers)} aria-current={isMembers ? 'page' : undefined} href={isMember ? memberPath(members.href) : members.href} onClick={close}>
                    <UsersRound className="pm-nav-icon" aria-hidden="true"/>{members.label}
                </Link>}
                <div className="pm-member-home-mobile-utilities" aria-label="More links">
                    <Link href="/pm-trends" onClick={close}><Newspaper aria-hidden="true"/>Trends</Link>
                    <Link href="/help-center" onClick={close}><CircleHelp aria-hidden="true"/>Help Center</Link>
                    <Link href="/contact" onClick={close}><Mail aria-hidden="true"/>Contact Us</Link>
                </div>
            </nav>
            {isMember && <div className="pm-member-home-header-actions">{actions ?? <DashboardHeader name={name} avatar={avatar} isDemo={isDemo} compact />}</div>}
            {user?.is_admin && <div className="pm-member-home-header-actions"><Link href="/admin" className="pm-member-home-admin-link">Administration</Link></div>}
            {!user && <div className="pm-member-home-header-actions pm-member-home-guest-actions">
                <Link href="/login" className="pm-member-home-guest-login">Log in</Link>
                <Link href="/register" className="pm-button pm-member-home-guest-join">{joinLabel}</Link>
            </div>}
            <details className="pm-member-home-utility-group" onKeyDown={closeOnEscape}>
                <summary aria-label="More PM Circle links"><Menu aria-hidden="true"/></summary>
                <div className="pm-member-home-submenu pm-member-home-utility-submenu">
                    <Link href="/pm-trends" onClick={closeDropdown}><Newspaper aria-hidden="true"/>Trends</Link>
                    <Link href="/help-center" onClick={closeDropdown}><CircleHelp aria-hidden="true"/>Help Center</Link>
                    <Link href="/contact" onClick={closeDropdown}><Mail aria-hidden="true"/>Contact Us</Link>
                </div>
            </details>
            <button type="button" className="pm-member-home-menu-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-controls="pm-member-home-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}>
                {mobileOpen ? <X size={22} aria-hidden="true"/> : <Menu size={22} aria-hidden="true"/>}
            </button>
        </div>
    </header>;
}
