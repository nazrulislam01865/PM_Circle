import { Link, router, usePage } from '@inertiajs/react';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings2, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';

export function DashboardHeader({ name, isDemo, onMenu }: { name: string; isDemo: boolean; onMenu: () => void }) {
    const [search, setSearch] = useState('');
    const learningSearch = usePage().url.startsWith('/learning');
    const [menuOpen, setMenuOpen] = useState(false);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = search.trim();
        if (query.length > 0) router.get(learningSearch ? '/learning' : '/community', { search: query });
    };
    return <header className="pm-dash-header">
        <button type="button" onClick={onMenu} className="pm-dash-mobile-menu" aria-label="Open dashboard navigation"><Menu size={24}/></button>
        <form className="pm-dash-search" role="search" onSubmit={submit}><Search size={22} aria-hidden="true"/><input aria-label="Search lessons, questions, people, or topics" placeholder={learningSearch ? "Search for learning paths, topics, posts or people..." : "Search lessons, questions, people, or topics..."} value={search} maxLength={80} onChange={event => setSearch(event.target.value)} /></form>
        <div className="pm-dash-header-right">
            <Link href="/dashboard/features/notifications" aria-label="Notifications" className="pm-dash-bell"><Bell size={25}/>{isDemo && <span aria-hidden="true"/>}</Link>
            <button type="button" className="pm-dash-account-button" onClick={() => setMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu"><DashboardAvatar name={name} size={43} demo={isDemo}/><ChevronDown size={18}/></button>
            {menuOpen && <div className="pm-dash-account-menu" role="menu"><Link href="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)}><UserRound size={17}/> My profile</Link><Link href="/settings/profile" role="menuitem" onClick={() => setMenuOpen(false)}><Settings2 size={17}/> Settings</Link><Link href="/logout" method="post" as="button" role="menuitem" onClick={() => setMenuOpen(false)}><LogOut size={17}/> Log out</Link></div>}
        </div>
    </header>;
}
