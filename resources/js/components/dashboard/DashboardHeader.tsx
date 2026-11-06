import { Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings2, UserRound } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';

/** Member-only actions for the common site header; retains existing search and account routes. */
export function DashboardHeader({ name, avatar, isDemo, onMenu }: { name: string; avatar?: string | null; isDemo: boolean; onMenu: () => void }) {
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const searchInput = useRef<HTMLInputElement>(null);
    const searchButton = useRef<HTMLButtonElement>(null);
    const learningSearch = usePage().url.startsWith('/learning');
    const [menuOpen, setMenuOpen] = useState(false);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = search.trim();
        if (query.length > 0) router.get(learningSearch ? '/learning' : '/community', { search: query });
    };
    return <div className="pm-dash-header-controls">
        <button type="button" onClick={onMenu} className="pm-dash-mobile-menu" aria-label="Open dashboard navigation"><Menu size={23}/></button>
        <form className={`pm-site-member-search${searchOpen ? ' is-open' : ''}`} role="search" onSubmit={submit}>
            <button ref={searchButton} type="button" aria-label="Search PM Circle" aria-expanded={searchOpen} aria-controls="pm-member-search-input"
                onClick={() => { setSearchOpen(value => !value); if (!searchOpen) requestAnimationFrame(() => searchInput.current?.focus()); }}><Search size={21} aria-hidden="true"/></button>
            <input id="pm-member-search-input" ref={searchInput} aria-label="Search lessons, questions, people, or topics"
                placeholder={learningSearch ? 'Search learning paths and topics...' : 'Search community discussions...'}
                value={search} maxLength={80} onChange={event => setSearch(event.target.value)}
                onKeyDown={event => { if (event.key === 'Escape') { setSearchOpen(false); searchButton.current?.focus(); } }}
                tabIndex={searchOpen ? 0 : -1}/>
        </form>
        <div className="pm-dash-header-right">
            <Link href="/dashboard/features/notifications" aria-label="Notifications" className="pm-dash-bell"><Bell size={23}/>{isDemo && <span aria-hidden="true"/>}</Link>
            <button type="button" className="pm-dash-account-button" onClick={() => setMenuOpen(value => !value)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"><DashboardAvatar name={name} size={40} demo={isDemo} src={avatar}/><ChevronDown size={17}/></button>
            {menuOpen && <div className="pm-dash-account-menu" role="menu"><Link href="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)}><UserRound size={17}/> My profile</Link><Link href="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)}><Settings2 size={17}/> Settings</Link><Link href="/logout" method="post" as="button" role="menuitem" onClick={() => setMenuOpen(false)}><LogOut size={17}/> Log out</Link></div>}
        </div>
    </div>;
}
