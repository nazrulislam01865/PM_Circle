import { Head, Link } from '@inertiajs/react';
import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Database, ExternalLink, Flag, House, LayoutDashboard, LogOut, Menu, PanelTop, Route, X } from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import { homepageSections, type HomepageSection, type HomepageSectionVisibility } from '@/components/admin/homepage-sections';
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
};

export function AdminLayout({ title, subtitle, children, active, selectedHomeSection, onSelectHomeSection, homepageVisibility, selectedCatalogCategory }: Props) {
    const isHomepage = active === '/admin/homepage';
    const isMaster = active === '/admin/master-data';
    const isNavigation = active === '/admin/navigation';
    const [homeOpen, setHomeOpen] = useState(isHomepage);
    const [masterOpen, setMasterOpen] = useState(isMaster);
    const [navOpen, setNavOpen] = useState(isNavigation);
    const [mobileOpen, setMobileOpen] = useState(false);
    // Both catalog areas reuse one Inertia page; expand the matching group on route changes.
    useEffect(() => {
        if (isHomepage) setHomeOpen(true);
        if (isMaster) setMasterOpen(true);
        if (isNavigation) setNavOpen(true);
    }, [active, isHomepage, isMaster, isNavigation]);
    const sectionLabel = homepageSections.find(section => section.key === selectedHomeSection)?.name;
    const catalogLabel = [...dropdownGroups, ...navigationGroups].find(group => group.key === selectedCatalogCategory)?.label;

    function adminGroup(icon: ReactNode, label: string, base: string, opened: boolean, toggle: () => void, groups: readonly { key: string; label: string }[]) {
        const activeGroup = active === base;
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
            </div>}
        </>;
    }

    return <div className="pm-admin">
        <Head title={`${title} · PM Circle Admin`} />
        <aside className="pm-admin-sidebar" aria-label="Admin sidebar">
            <div className="pm-admin-brand"><Brand/><span className="pm-admin-brand-label">ADMINISTRATION</span></div>
            <button className="pm-admin-mobile-toggle" type="button" aria-controls="pm-admin-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X size={18}/> : <Menu size={18}/>} {mobileOpen ? 'Close menu' : 'Admin menu'}
            </button>
            <nav id="pm-admin-navigation" aria-label="Administrator navigation" className={`pm-admin-nav ${mobileOpen ? 'is-mobile-open' : ''}`}>
                <span className="pm-admin-nav-label">WORKSPACE</span>
                <Link href="/admin" aria-current={active === '/admin' ? 'page' : undefined} className={`pm-admin-nav-link ${active === '/admin' ? 'is-active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard size={18} aria-hidden="true"/> <span>Overview</span>
                </Link>
                <Link href="/admin/post-reports" className={`pm-admin-nav-link ${active === "/admin/post-reports" ? "is-active" : ""}`} onClick={() => setMobileOpen(false)}><Flag size={18} aria-hidden="true"/><span>Community moderation</span></Link>
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
                            : <Link key={section.key} href={`/admin/homepage?section=${section.key}`} className="pm-admin-submenu-link" onClick={() => setMobileOpen(false)}>
                                <span className="pm-admin-submenu-marker" aria-hidden="true"/><span>{section.name}</span>
                            </Link>;
                    })}
                </div>}
                {adminGroup(<Route size={18} aria-hidden="true"/>, 'Navigation control', '/admin/navigation', navOpen, () => setNavOpen(value => !value), navigationGroups)}
                {adminGroup(<Database size={18} aria-hidden="true"/>, 'Master data', '/admin/master-data', masterOpen, () => setMasterOpen(value => !value), dropdownGroups)}
                <span className="pm-admin-nav-label pm-admin-nav-label-separate">QUICK LINKS</span>
                <Link href="/" className="pm-admin-nav-link" onClick={() => setMobileOpen(false)}><House size={18} aria-hidden="true"/><span>Public homepage</span><ExternalLink size={14} aria-hidden="true"/></Link>
                <Link href="/admin/logout" method="post" as="button" className="pm-admin-nav-link pm-admin-logout" onClick={() => setMobileOpen(false)}><LogOut size={18} aria-hidden="true"/><span>Sign out</span></Link>
            </nav>
        </aside>
        <div className="pm-admin-body">
            <header className="pm-admin-topbar">
                <div className="pm-admin-breadcrumb"><span>PM Circle</span><span aria-hidden="true">/</span><span>Administration</span><span aria-hidden="true">/</span><strong>{title}</strong>
                    {(sectionLabel || catalogLabel) && <><span aria-hidden="true">/</span><span>{sectionLabel || catalogLabel}</span></>}
                </div>
                <Link href="/" className="pm-admin-view-site">View website <ExternalLink size={16} aria-hidden="true"/></Link>
            </header>
            <main className="pm-admin-content" id="admin-main">
                <div className="pm-admin-page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>
                {children}
            </main>
        </div>
    </div>;
}
