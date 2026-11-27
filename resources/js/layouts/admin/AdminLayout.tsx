import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Database, ExternalLink, Flag, House, LayoutDashboard, LogOut, Menu, PanelTop, ClipboardCheck, Gift, Route, Settings2, CalendarDays, X, BookOpen, Heart, MessageSquareMore, Search, Bell } from 'lucide-react';
import { aiWorkspaceLinks } from '@/components/admin/ai/workspace-navigation';
import { Brand } from '@/components/pm/Brand';
import { homepageSections, type HomepageSection, type HomepageSectionVisibility } from '@/components/admin/homepage-sections';
import { pmpPublicSections } from '@/components/admin/pmp-public-sections';
import type { PmpPublicSection } from '@/types/pmp-public';
import { dropdownGroups, navigationGroups } from '@/components/admin/catalog-groups';

type Props = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    active: string;
    selectedHomeSection?: HomepageSection;
    onSelectHomeSection?: (section: HomepageSection) => void;
    homepageVisibility?: HomepageSectionVisibility;
    selectedCatalogCategory?: string;
    selectedPmpSection?: PmpPublicSection;
    onSelectPmpSection?: (section: PmpPublicSection) => void;
    pmpVisibility?: Record<PmpPublicSection, boolean>;
    headingAction?: ReactNode;
    breadcrumb?: string[];
    dashboardHeader?: { pendingReviews: number };
};

const aiSettingsLinks = [
    { title: 'Career Trends', href: '/admin/ai/career-trends' },
    { title: 'Daily Challenge AI', href: '/admin/ai/daily-challenge' },
    { title: 'PMP Exam Simulator AI', href: '/admin/ai/pmp-settings' },
    { title: 'Feed Moderation AI', href: '/admin/ai/feed-moderation' },
    { title: 'AI usage management', href: '/admin/ai/usage-management' },
];

// Admin pages own their layout instance. Keep only navigation UI state across
// Inertia page remounts, independently of the document scroll position.
const adminSidebarState = {
    scrollTop: 0,
    groups: { workspace: false, ai: false, home: false, master: false, navigation: false, pmp: false },
};

export function AdminLayout({ title, subtitle, children, active, selectedHomeSection, onSelectHomeSection, homepageVisibility, selectedCatalogCategory, selectedPmpSection, onSelectPmpSection, pmpVisibility, headingAction, breadcrumb, dashboardHeader }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string } | null } }>().props;
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [profileOpen, setProfileOpen] = useState(false);
    const quickLinks = [
        { title: 'Community moderation', href: '/admin/post-reports' },
        ...aiSettingsLinks,
        ...aiWorkspaceLinks,
        { title: 'Interview preparation', href: '/admin/interview-preparation' },
        { title: 'Course library', href: '/admin/learning/courses' },
        { title: 'Browse Courses control', href: '/admin/learning/courses/catalog-settings' },
        { title: 'Community events', href: '/admin/events' },
        { title: 'Manage rewards', href: '/admin/profile-rewards' },
        { title: 'Homepage control', href: '/admin/homepage' },
        { title: 'About Us control', href: '/admin/public-pages/about' },
        { title: 'Trends page control', href: '/admin/public-pages/trends' },
        { title: 'Compare Plans control', href: '/admin/public-pages/compare-plans' },
        { title: 'Refund Policy control', href: '/admin/public-pages/refund-policy' },
        { title: 'Trend reports', href: '/admin/trend-reports' },
        { title: 'Terms and Conditions', href: '/admin/legal/terms' },
        { title: 'Privacy Policy', href: '/admin/legal/privacy' },
        { title: 'PMP questions', href: '/admin/exam-simulator/pmp/questions' },
        { title: 'Master data', href: '/admin/master-data' },
    ];
    const isHomepage = active === '/admin/homepage';
    const isMaster = active === '/admin/master-data';
    const isNavigation = active === '/admin/navigation' || active === '/admin/footer';
    const isPmp = active === '/admin/exam-simulator/pmp';
    const isPmpBank = active === '/admin/exam-simulator/pmp/questions';
    const isAi = aiSettingsLinks.some(item => item.href === active);
    const isAiWorkspace = active.startsWith('/admin/ai/workspace/');
    const [workspaceOpen, setWorkspaceOpen] = useState(() => isAiWorkspace || adminSidebarState.groups.workspace);
    const isCatalogSettings = active === '/admin/learning/courses/catalog-settings';
    const isLearning = active.startsWith('/admin/learning/courses') && !isCatalogSettings;
    const [aiOpen, setAiOpen] = useState(() => isAi || adminSidebarState.groups.ai);
    const [homeOpen, setHomeOpen] = useState(() => isHomepage || adminSidebarState.groups.home);
    const [masterOpen, setMasterOpen] = useState(() => isMaster || adminSidebarState.groups.master);
    const [navOpen, setNavOpen] = useState(() => isNavigation || adminSidebarState.groups.navigation);
    const [pmpOpen, setPmpOpen] = useState(() => isPmp || adminSidebarState.groups.pmp);
    const [mobileOpen, setMobileOpen] = useState(false);
    const sidebarRef = useRef<HTMLElement>(null);

    useLayoutEffect(() => {
        adminSidebarState.groups = { workspace: workspaceOpen, ai: aiOpen, home: homeOpen, master: masterOpen, navigation: navOpen, pmp: pmpOpen };
    }, [workspaceOpen, aiOpen, homeOpen, masterOpen, navOpen, pmpOpen]);

    useLayoutEffect(() => {
        const sidebar = sidebarRef.current;
        if (sidebar && !window.matchMedia('(max-width: 45rem)').matches) {
            sidebar.scrollTop = adminSidebarState.scrollTop;
        }
    }, []);

    function rememberSidebarPosition() {
        const sidebar = sidebarRef.current;
        // Mobile uses a separate, collapsible navigation surface. Its zero
        // scroll position must not overwrite the desktop sidebar position.
        if (sidebar && !window.matchMedia('(max-width: 45rem)').matches) {
            adminSidebarState.scrollTop = sidebar.scrollTop;
        }
    }

    // Both catalog areas reuse one Inertia page; expand the matching group on route changes.
    useEffect(() => {
        if (isAi) setAiOpen(true);
        if (isAiWorkspace) setWorkspaceOpen(true);
        if (isHomepage) setHomeOpen(true);
        if (isMaster) setMasterOpen(true);
        if (isNavigation) setNavOpen(true);
        if (isPmp) setPmpOpen(true);
    }, [active, isAi, isAiWorkspace, isHomepage, isMaster, isNavigation, isPmp]);
    const sectionLabel = homepageSections.find(section => section.key === selectedHomeSection)?.name;
    const catalogLabel = [...dropdownGroups, ...navigationGroups].find(group => group.key === selectedCatalogCategory)?.label;
    const pmpLabel = isPmp ? pmpPublicSections.find(section => section.key === selectedPmpSection)?.title : undefined;

    function adminGroup(icon: ReactNode, label: string, base: string, opened: boolean, toggle: () => void, groups: readonly { key: string; label: string }[]) {
        const activeGroup = active === base || (base === '/admin/navigation' && active === '/admin/footer');
        const id = `admin-${base.replace(/\W/g, '-')}-children`;
        return <>
            <div className={`pm-admin-nav-parent ${activeGroup ? 'is-current-group' : ''}`}>
                <Link href={base} className={`pm-admin-nav-link pm-admin-nav-parent-link ${activeGroup ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    {icon}<span className="pm-admin-nav-text">{label}</span>
                </Link>
                <button type="button" className="pm-admin-nav-toggle" aria-label={`${opened ? 'Collapse' : 'Expand'} ${label}`} aria-expanded={opened} aria-controls={id} onClick={toggle}>
                    {opened ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}
                </button>
            </div>
            {opened && <div id={id} className="pm-admin-submenu" aria-label={`${label} sections`}>
                {groups.map(group => <Link key={group.key} href={`${base}?category=${group.key}`}
                    aria-current={activeGroup && selectedCatalogCategory === group.key ? 'page' : undefined}
                    className={`pm-admin-submenu-link ${activeGroup && selectedCatalogCategory === group.key ? 'is-active' : ''}`}
                    onClick={() => setMobileOpen(false)}>
                    <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{group.label}</span>
                </Link>)}
                {base === '/admin/navigation' && <Link href="/admin/footer"
                    aria-current={active === '/admin/footer' ? 'page' : undefined}
                    className={`pm-admin-submenu-link ${active === '/admin/footer' ? 'is-active' : ''}`}
                    onClick={() => setMobileOpen(false)}>
                    <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>Footer control</span>
                </Link>}
            </div>}
        </>;
    }

    return <div className="pm-admin">
        <Head title={`${title} · PM Circle Admin`} />
        <aside ref={sidebarRef} className="pm-admin-sidebar" aria-label="Admin sidebar" onScroll={rememberSidebarPosition} onClickCapture={rememberSidebarPosition}>
            <div className="pm-admin-brand"><Brand/><span className="pm-admin-brand-label">ADMINISTRATION</span></div>
            <button className="pm-admin-mobile-toggle" type="button" aria-controls="pm-admin-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={18}/> : <Menu size={18}/>} {mobileOpen ? 'Close menu' : 'Admin menu'}
            </button>
            <nav id="pm-admin-navigation" aria-label="Administrator navigation" className={`pm-admin-nav ${mobileOpen ? 'is-mobile-open' : ''}`}>
                <span className="pm-admin-nav-label">WORKSPACE</span>
                <Link href="/admin" aria-current={active === '/admin' ? 'page' : undefined} className={`pm-admin-nav-link ${active === '/admin' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard size={18} aria-hidden="true"/> <span>Overview</span>
                </Link>
                <Link href="/admin/post-reports" className={`pm-admin-nav-link ${(active === "/admin/post-reports") ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}><Flag size={18} aria-hidden="true"/><span>Community moderation</span></Link>
                <Link href="/admin/support-requests" className={`pm-admin-nav-link ${active === '/admin/support-requests' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><MessageSquareMore size={18} aria-hidden="true"/><span>Support requests</span></Link>
                <Link href="/admin/reaction-icons" aria-current={active === '/admin/reaction-icons' ? 'page' : undefined}
                    className={`pm-admin-nav-link ${active === '/admin/reaction-icons' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <Heart size={18} aria-hidden="true"/><span>Reaction icons</span>
                </Link>
                <Link href="/admin/profile-rewards" aria-current={active === '/admin/profile-rewards' ? 'page' : undefined}
                    className={`pm-admin-nav-link ${active === '/admin/profile-rewards' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <Gift size={18} aria-hidden="true"/><span>Profile rewards</span>
                </Link>
                <button type="button" className={`pm-admin-nav-link pm-admin-nav-group-button ${isAiWorkspace ? 'is-active' : ''}`}
                    aria-expanded={workspaceOpen} aria-controls="pm-admin-ai-workspace-submenu" onClick={() => setWorkspaceOpen(open => !open)}>
                    <LayoutDashboard size={18} aria-hidden="true"/><span>AI Workspace</span>
                    {workspaceOpen ? <ChevronDown size={17} aria-hidden="true"/> : <ChevronRight size={17} aria-hidden="true"/>}
                </button>
                {workspaceOpen && <div id="pm-admin-ai-workspace-submenu" className="pm-admin-submenu pm-ai-workspace-nav" aria-label="AI Workspace">
                    {aiWorkspaceLinks.map(item => <Link key={item.href} href={item.href} aria-current={active === item.href ? 'page' : undefined}
                        className={`pm-admin-submenu-link ${active === item.href ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <item.icon size={18} aria-hidden="true"/><span>{item.title}</span>
                    </Link>)}
                </div>}
                <button type="button" className={`pm-admin-nav-link pm-admin-nav-group-button ${isAi ? 'is-active' : ''}`}
                    aria-expanded={aiOpen} aria-controls="pm-admin-ai-submenu" onClick={() => setAiOpen(open => !open)}>
                    <Settings2 size={18} aria-hidden="true"/><span>AI settings</span>
                    {aiOpen ? <ChevronDown size={17} aria-hidden="true"/> : <ChevronRight size={17} aria-hidden="true"/>}
                </button>
                {aiOpen && <div id="pm-admin-ai-submenu" className="pm-admin-submenu" aria-label="AI settings sections">
                    {aiSettingsLinks.map(item => <Link key={item.href} href={item.href}
                        aria-current={active === item.href ? 'page' : undefined}
                        className={`pm-admin-submenu-link ${active === item.href ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{item.title}</span>
                    </Link>)}
                </div>}
                <div className={`pm-admin-nav-parent ${isHomepage ? 'is-current-group' : ''}`}>
                    <Link href="/admin/homepage" className={`pm-admin-nav-link pm-admin-nav-parent-link ${isHomepage ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <PanelTop size={18} aria-hidden="true"/><span className="pm-admin-nav-text">Homepage control</span>
                    </Link>
                    <button type="button" className="pm-admin-nav-toggle" aria-label={`${homeOpen ? 'Collapse' : 'Expand'} Homepage control`} aria-expanded={homeOpen} aria-controls="pm-admin-homepage-submenu" onClick={() => setHomeOpen(value => !value)}>
                        {homeOpen ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}
                    </button>
                </div>
                {homeOpen && <div id="pm-admin-homepage-submenu" className="pm-admin-submenu" aria-label="Homepage sections">
                    {homepageSections.map(section => {
                        const selected = isHomepage && section.key === selectedHomeSection;
                        return onSelectHomeSection && isHomepage
                            ? <button key={section.key} type="button" className={`pm-admin-submenu-link ${selected ? 'is-active' : ''}`} aria-current={selected ? 'step' : undefined}
                                onClick={() => { onSelectHomeSection(section.key); setMobileOpen(false); }}>
                                <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{section.name}</span>
                                {homepageVisibility && !homepageVisibility[section.key] && <span className="pm-admin-submenu-status">Hidden</span>}
                            </button>
                            : <Link key={section.key} href={`/admin/homepage?section=${section.key}`}
                                className={`pm-admin-submenu-link ${selected ? 'is-active' : ''}`} aria-current={selected ? 'page' : undefined} onClick={() => setMobileOpen(false)}>
                                <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{section.name}</span>
                            </Link>;
                    })}
                </div>}
                <div className={`pm-admin-nav-parent ${isPmp ? 'is-current-group' : ''}`}>
                    <Link href="/admin/exam-simulator/pmp" aria-current={isPmp ? 'page' : undefined}
                        className={`pm-admin-nav-link pm-admin-nav-parent-link ${isPmp ? 'is-active' : ''}`}
                        onClick={() => setMobileOpen(false)}>
                        <ClipboardCheck size={18} aria-hidden="true"/><span className="pm-admin-nav-text">PMP public page</span>
                    </Link>
                    <button type="button" className="pm-admin-nav-toggle" aria-label={`${pmpOpen ? 'Collapse' : 'Expand'} PMP public page`}
                        aria-controls="pm-admin-pmp-submenu" aria-expanded={pmpOpen} onClick={() => setPmpOpen(open => !open)}>
                        {pmpOpen ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}
                    </button>
                </div>
                {pmpOpen && <div id="pm-admin-pmp-submenu" className="pm-admin-submenu" aria-label="PMP public page sections">
                    {pmpPublicSections.map(section => {
                        const selected = isPmp && section.key === selectedPmpSection;
                        const contents = <><span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{section.title}</span>
                            {pmpVisibility && !pmpVisibility[section.key] && <span className="pm-admin-submenu-status">Hidden</span>}</>;
                        return isPmp && onSelectPmpSection
                            ? <button key={section.key} type="button" className={`pm-admin-submenu-link ${selected ? 'is-active' : ''}`}
                                aria-current={selected ? 'step' : undefined}
                                onClick={() => { onSelectPmpSection(section.key); setMobileOpen(false); }}>{contents}</button>
                            : <Link key={section.key} href={`/admin/exam-simulator/pmp?section=${section.key}`}
                                className="pm-admin-submenu-link" onClick={() => setMobileOpen(false)}>{contents}</Link>;
                    })}
                </div>}
                <Link href="/admin/exam-simulator/pmp/questions" aria-current={isPmpBank ? 'page' : undefined}
                    className={`pm-admin-nav-link ${isPmpBank ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <ClipboardCheck size={18} aria-hidden="true"/><span>PMP questions &amp; settings</span>
                </Link>
                <Link href="/admin/interview-preparation" aria-current={active === '/admin/interview-preparation' ? 'page' : undefined}
                    className={`pm-admin-nav-link ${active === '/admin/interview-preparation' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <MessageSquareMore size={18} aria-hidden="true"/><span>Interview preparation</span>
                </Link>
                <Link href="/admin/learning/courses" aria-current={isLearning ? 'page' : undefined}
                    className={`pm-admin-nav-link ${isLearning ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <BookOpen size={18} aria-hidden="true"/><span>Course library</span>
                </Link>
                <Link href="/admin/learning/courses/catalog-settings" aria-current={isCatalogSettings ? 'page' : undefined} className={`pm-admin-nav-link ${isCatalogSettings ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><PanelTop size={18} aria-hidden="true"/><span>Browse Courses control</span></Link>
                {[{href: '/admin/public-pages/about', title: 'About Us control'}, {href: '/admin/public-pages/trends', title: 'Trends page control'}, {href: '/admin/public-pages/compare-plans', title: 'Compare Plans control'}, {href: '/admin/public-pages/refund-policy', title: 'Refund Policy control'}, {href: '/admin/trend-reports', title: 'Trend reports'}].map(item => <Link key={item.href} href={item.href} aria-current={active === item.href ? 'page' : undefined} className={`pm-admin-nav-link ${active === item.href ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><PanelTop size={18} aria-hidden="true"/><span>{item.title}</span></Link>)}
                <Link href="/admin/events" aria-current={active === '/admin/events' ? 'page' : undefined} className={`pm-admin-nav-link ${active === '/admin/events' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><CalendarDays size={18} aria-hidden="true"/><span>Community events</span></Link>
                <Link href="/admin/legal/terms" aria-current={active === '/admin/legal/terms' ? 'page' : undefined} className={`pm-admin-nav-link ${active === '/admin/legal/terms' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><ClipboardCheck size={18} aria-hidden="true"/><span>Terms and Conditions</span></Link>
                <Link href="/admin/legal/privacy" aria-current={active === '/admin/legal/privacy' ? 'page' : undefined} className={`pm-admin-nav-link ${active === '/admin/legal/privacy' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}><ClipboardCheck size={18} aria-hidden="true"/><span>Privacy Policy</span></Link>
                {adminGroup(<Route size={18} aria-hidden="true"/>, 'Navigation control', '/admin/navigation', navOpen, () => setNavOpen(value => !value), navigationGroups)}
                {adminGroup(<Database size={18} aria-hidden="true"/>, 'Master data', '/admin/master-data', masterOpen, () => setMasterOpen(value => !value), dropdownGroups)}
                <span className="pm-admin-nav-label pm-admin-nav-label-separate">QUICK LINKS</span>
                <Link href="/" className="pm-admin-nav-link" onClick={() => setMobileOpen(false)}><House size={18} aria-hidden="true"/><span>Public homepage</span><ExternalLink size={14} aria-hidden="true"/></Link>
                <Link href="/admin/logout" method="post" as="button" className="pm-admin-nav-link pm-admin-logout" onClick={() => setMobileOpen(false)}><LogOut size={18} aria-hidden="true"/><span>Sign out</span></Link>
            </nav>
        </aside>
        <div className="pm-admin-body">
            <header className="pm-admin-topbar">
                <div className="pm-admin-breadcrumb">{breadcrumb ? breadcrumb.map((item, index) => <span key={item}>{index > 0 && <span aria-hidden="true"> / </span>}{index === breadcrumb.length - 1 ? <strong>{item}</strong> : item}</span>) : <><span>PM Circle</span><span aria-hidden="true">/</span><span>Administration</span><span aria-hidden="true">/</span><strong>{title}</strong></>}
                    {(sectionLabel || catalogLabel || pmpLabel) && <><span aria-hidden="true">/</span><span>{sectionLabel || catalogLabel || pmpLabel}</span></>}
                </div>
                {dashboardHeader ? <div className="pm-admin-overview-top-actions">
                    <div className="pm-admin-overview-top-popover">
                        <button className="pm-admin-overview-header-button" aria-label="Search admin pages" aria-expanded={searchOpen} type="button" onClick={() => { setSearchOpen(!searchOpen); setProfileOpen(false); }}><Search size={20}/></button>
                        {searchOpen && <div className="pm-admin-overview-popover pm-admin-overview-search">
                            <label htmlFor="pm-admin-quick-search">Find an admin page</label>
                            <input id="pm-admin-quick-search" type="search" autoFocus value={searchValue} placeholder="Search admin pages" onChange={event => setSearchValue(event.target.value)}/>
                            <div className="pm-admin-overview-search-results">
                                {quickLinks.filter(item => item.title.toLowerCase().includes(searchValue.trim().toLowerCase())).map(item => <Link href={item.href} key={item.href} onClick={() => setSearchOpen(false)}>{item.title}</Link>)}
                                {!quickLinks.some(item => item.title.toLowerCase().includes(searchValue.trim().toLowerCase())) && <span>No matching admin pages</span>}
                            </div>
                        </div>}
                    </div>
                    <Link href="/admin/post-reports" className="pm-admin-overview-header-button" aria-label={`${dashboardHeader.pendingReviews} pending moderation items`} title="Pending moderation"><Bell size={20}/>{dashboardHeader.pendingReviews > 0 && <span className="pm-admin-overview-header-count">{dashboardHeader.pendingReviews > 99 ? '99+' : dashboardHeader.pendingReviews}</span>}</Link>
                    <div className="pm-admin-overview-top-popover pm-admin-overview-user">
                        <button type="button" className="pm-admin-overview-account" aria-expanded={profileOpen} onClick={() => { setProfileOpen(!profileOpen); setSearchOpen(false); }}>
                            <span>{auth?.user?.name?.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'AD'}</span><strong>{auth?.user?.name || 'Admin'}</strong><ChevronDown size={16}/>
                        </button>
                        {profileOpen && <div className="pm-admin-overview-popover pm-admin-overview-profile-menu">
                            <Link href="/" onClick={() => setProfileOpen(false)}>View website <ExternalLink size={14}/></Link>
                            <Link href="/admin/logout" method="post" as="button" onClick={() => setProfileOpen(false)}>Sign out <LogOut size={14}/></Link>
                        </div>}
                    </div>
                </div> : <Link href="/" className="pm-admin-view-site">View website <ExternalLink size={16} aria-hidden="true"/></Link>}
            </header>
            <main className="pm-admin-content" id="admin-main">
                <div className="pm-admin-page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{headingAction}</div>
                {children}
            </main>
        </div>
    </div>;
}
