import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { HomeSearch } from './HomeSearch';
import { Brand } from '@/components/pm/Brand';

type NavigationLink = { href: string; label: string };

/** Prototype-specific guest header; other pages continue to render SiteHeader unchanged. */
export function HomeHeader({ eventsVisible = true }: { eventsVisible?: boolean }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const page = usePage<{ siteNavigation?: { header?: NavigationLink[] }; auth?: { user?: { is_admin?: boolean } | null } }>();
    const { siteNavigation, auth } = page.props;
    const allowed = (href: string) => !siteNavigation?.header || siteNavigation.header.some(item => item.href === href);
    const close = useCallback(() => { setMenuOpen(false); setSearchOpen(false); }, []);

    return <header className="pm-v2-header" aria-label="PM Circle site header">
        <div className="pm-v2-container pm-v2-header-inner">
            <Brand />
            <nav className={`pm-v2-header-nav${menuOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
                <details className="pm-v2-nav-menu"><summary>Exam Simulator <ChevronDown aria-hidden="true"/></summary>
                    <div className="pm-v2-nav-dropdown">
                        <Link href="/exam-simulator/pmp" onClick={close}>PMP Exam Simulator</Link>
                        <Link href="/simulators/scrum" onClick={close}>CSM Exam Simulator</Link>
                        <Link href="/simulators/project" onClick={close}>Business Analysis · Preview</Link>
                    </div>
                </details>
                {allowed('/learning') && <details className="pm-v2-nav-menu"><summary>Learn &amp; Practice <ChevronDown aria-hidden="true"/></summary>
                    <div className="pm-v2-nav-dropdown"><Link href="/learning" onClick={close}>Course library</Link>
                        <Link href="/learning/skills-check" onClick={close}>Skills check</Link></div>
                </details>}
                {allowed('/community') && <details className="pm-v2-nav-menu"><summary>Community <ChevronDown aria-hidden="true"/></summary>
                    <div className="pm-v2-nav-dropdown"><Link href="/community" onClick={close}>Feed</Link>
                        <Link href="/daily-challenge" onClick={close}>Daily Challenge</Link>
                        <Link href="/members" onClick={close}>Members</Link></div>
                </details>}
                {eventsVisible && <Link href="/events" onClick={close}>Events</Link>}
            </nav>
            <div className="pm-v2-header-utilities">
                <button type="button" className="pm-v2-search-toggle" aria-expanded={searchOpen} aria-controls="pm-v2-header-search" onClick={() => setSearchOpen(value => !value)}>
                    <Search aria-hidden="true"/> Search
                </button>
                {auth?.user?.is_admin ? <Link href="/admin" className="pm-v2-button pm-v2-button-primary">Administration</Link> : <>
                    <Link href="/login" className="pm-v2-login">Log in</Link>
                    <Link href="/register" className="pm-v2-button pm-v2-button-primary">Join free</Link>
                </>}
                <button type="button" className="pm-v2-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
                    {menuOpen ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}
                </button>
            </div>
        </div>
        {searchOpen && <HomeSearch onClose={close}/>}
    </header>;
}
