import { Link, usePage } from '@inertiajs/react';
import { BookOpen, BriefcaseBusiness, ChevronDown, Layers3, Menu, MessageCircle, Monitor, PlaySquare, X } from 'lucide-react';
import { useState } from 'react';
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

/** A single authenticated navigation, reused by member workspaces and public content pages. */
export function MemberHomeHeader({ dashboard }: { dashboard?: DashboardShellData }) {
    const page = usePage<{
        auth?: { user?: { name: string; avatar_path?: string | null } | null };
        siteNavigation?: { header?: NavigationLink[] };
    }>();
    const [mobileOpen, setMobileOpen] = useState(false);
    const configured = page.props.siteNavigation?.header ?? defaultLinks;
    const links = configured.filter(item => defaultLinks.some(entry => entry.href === item.href));
    const item = (href: string) => links.find(link => link.href === href);
    const daily = item('/daily-challenge');
    const community = item('/community');
    const learning = item('/learning');
    const careers = item('/careers');
    const members = item('/members');
    const close = () => setMobileOpen(false);
    const pathname = page.url.split('?')[0].split('#')[0];
    const isHome = pathname === '/dashboard';
    const isDaily = pathname.startsWith('/dashboard/daily-challenge') || pathname === '/daily-challenge' || pathname.startsWith('/scenarios/');
    const isCommunity = pathname === '/community' || pathname.startsWith('/posts/');
    const isLearning = pathname.startsWith('/dashboard/learning') || pathname === '/learning' || pathname.startsWith('/learning/') || pathname.startsWith('/exams/') || pathname.startsWith('/interview-preparation');
    const isCareers = pathname.startsWith('/careers') || pathname.startsWith('/dashboard/features/career');
    const isMembers = pathname === '/members' || pathname.startsWith('/members/');
    // Site-layout routes already share the authenticated user's identity. They do not
    // need a second dashboard projection just to render this header.
    const name = dashboard?.member.name ?? page.props.auth?.user?.name ?? 'Member';
    const avatar = dashboard?.member.avatar_path ?? page.props.auth?.user?.avatar_path;
    const isDemo = dashboard?.isDemo ?? false;

    return <header className="pm-member-home-header pm-site-header">
        <div className="pm-member-home-header-inner">
            <div className="pm-member-home-brand"><Brand href="/dashboard" /></div>
            <nav id="pm-member-home-navigation" className={`pm-member-home-nav${mobileOpen ? ' is-open' : ''}`} aria-label="Member navigation">
                <Link href="/dashboard" className={`pm-member-home-nav-link${isHome ? ' is-active' : ''}`} aria-current={isHome ? 'page' : undefined} onClick={close}>Home</Link>
                {daily && <Link className={`pm-member-home-nav-link${isDaily ? ' is-active' : ''}`} aria-current={isDaily ? 'page' : undefined} href={memberPath(daily.href)} onClick={close}>{daily.label}</Link>}
                {community && <Link className={`pm-member-home-nav-link${isCommunity ? ' is-active' : ''}`} aria-current={isCommunity ? 'page' : undefined} href={memberPath(community.href)} onClick={close}>{community.label === 'Community Feed' ? 'Community' : community.label}</Link>}
                {learning && <details className="pm-member-home-nav-group" onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }}>
                    <summary className={isLearning ? 'is-current' : undefined} aria-current={isLearning ? 'page' : undefined}>{learning.label}<ChevronDown size={15} aria-hidden="true" /></summary>
                    <div className="pm-member-home-submenu">
                        <span className="pm-member-home-menu-heading">Learn</span>
                        <Link href="/dashboard/learning" onClick={close}><BookOpen size={18}/> Course Library</Link>
                        <Link href="/dashboard/learning" onClick={close}><Layers3 size={18}/> My Learning</Link>
                        <span className="pm-member-home-menu-heading is-separated">Simulators</span>
                        <Link href="/exams/pmp" onClick={close}><Monitor size={18}/> PMP Exam Simulator</Link>
                        <Link href="/dashboard/features/scrum" onClick={close}><MessageCircle size={18}/> Scrum / CSM Simulator</Link>
                        <Link href="/dashboard/features/simulations" onClick={close}><PlaySquare size={18}/> Project Simulator</Link>
                    </div>
                </details>}
                {careers && <details className="pm-member-home-nav-group" onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }}>
                    <summary className={isCareers ? 'is-current' : undefined} aria-current={isCareers ? 'page' : undefined}>{careers.label}<ChevronDown size={15} aria-hidden="true" /></summary>
                    <div className="pm-member-home-submenu">
                        <Link href="/careers" onClick={close}><BriefcaseBusiness size={18}/> Browse Jobs</Link>
                        <Link href="/dashboard/features/career" onClick={close}><Layers3 size={18}/> Career Tools</Link>
                    </div>
                </details>}
                {members && <Link className={`pm-member-home-nav-link${isMembers ? ' is-active' : ''}`} aria-current={isMembers ? 'page' : undefined} href={memberPath(members.href)} onClick={close}>{members.label}</Link>}
            </nav>
            <div className="pm-member-home-header-actions"><DashboardHeader name={name} avatar={avatar} isDemo={isDemo} compact /></div>
            <button type="button" className="pm-member-home-menu-toggle" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-controls="pm-member-home-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(value => !value)}>
                {mobileOpen ? <X size={22} aria-hidden="true"/> : <Menu size={22} aria-hidden="true"/>}
            </button>
        </div>
    </header>;
}
