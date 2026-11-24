import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { HomeSearch } from './HomeSearch';
import { Brand } from '@/components/pm/Brand';

type NavigationLink = { href: string; label: string };

/** One reusable dropdown for the three approved public-header groups. */
function HeaderDropdown({ label, items, onNavigate }: { label: string; items: NavigationLink[]; onNavigate: () => void }) {
    const detailsRef = useRef<HTMLDetailsElement>(null);
    const closeDropdown = () => { detailsRef.current?.removeAttribute('open'); onNavigate(); };

    return <details ref={detailsRef} className="pm-v2-nav-menu"
        onPointerLeave={event => { if (event.pointerType === 'mouse') detailsRef.current?.removeAttribute('open'); }}
        onKeyDown={event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                detailsRef.current?.removeAttribute('open');
                detailsRef.current?.querySelector('summary')?.focus();
            }
        }}>
        <summary>{label} <ChevronDown aria-hidden="true"/></summary>
        <div className="pm-v2-nav-dropdown">
            {items.map(item => item.href.startsWith('/#')
                ? <a key={item.href} href={item.href} onClick={closeDropdown}>{item.label}</a>
                : <Link key={item.href} href={item.href} onClick={closeDropdown}>{item.label}</Link>)}
        </div>
    </details>;
}

/** The approved public-page header. Existing member navigation remains untouched. */
export function HomeHeader({ eventsVisible = true }: { eventsVisible?: boolean }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const page = usePage<{ auth?: { user?: { is_admin?: boolean } | null } }>();
    const { auth } = page.props;
    const close = useCallback(() => { setMenuOpen(false); setSearchOpen(false); }, []);

    return <header className="pm-v2-header" aria-label="PM Circle site header">
        <div className="pm-v2-container pm-v2-header-inner">
            <Brand />
            <nav className={`pm-v2-header-nav${menuOpen ? ' is-open' : ''}`} aria-label="Primary navigation">
                <HeaderDropdown label="Exam Simulator" onNavigate={close} items={[
                    { href: '/simulators', label: 'Browse simulators' },
                    { href: '/pricing', label: 'Compare Plans' },
                ]}/>
                <HeaderDropdown label="Learn & Practice" onNavigate={close} items={[
                    { href: '/learning', label: 'Browse courses' },
                    { href: '/#pm-v2-ai', label: 'AI learning tools' },
                ]}/>
                <HeaderDropdown label="Community" onNavigate={close} items={[
                    { href: '/community', label: 'Community feed' },
                    { href: '/daily-challenge', label: 'Daily Challenge' },
                    { href: '/events', label: 'Community events' },
                ]}/>
                <Link href="/pm-trends" onClick={close} aria-current={page.url.split('?')[0] === '/pm-trends' ? 'page' : undefined}>Trends</Link>
                {eventsVisible && <Link href="/events" onClick={close}>Events</Link>}
                {!auth?.user?.is_admin && <Link href="/login" className="pm-v2-mobile-login" onClick={close}>Log in</Link>}
            </nav>
            <div className="pm-v2-header-utilities">
                <button type="button" className="pm-v2-search-toggle" aria-label="Search" aria-expanded={searchOpen} aria-controls="pm-v2-header-search" onClick={() => { setMenuOpen(false); setSearchOpen(value => !value); }}>
                    <Search aria-hidden="true"/> Search
                </button>
                {auth?.user?.is_admin ? <Link href="/admin" className="pm-v2-button pm-v2-button-primary">Administration</Link> : <>
                    <Link href="/login" className="pm-v2-login">Log in</Link>
                    <Link href="/register" className="pm-v2-button pm-v2-button-primary">Join free</Link>
                </>}
                <button type="button" className="pm-v2-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => { setSearchOpen(false); setMenuOpen(value => !value); }}>
                    {menuOpen ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}
                </button>
            </div>
        </div>
        {searchOpen && <HomeSearch onClose={close}/>}
    </header>;
}
