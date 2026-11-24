import { Link, router } from '@inertiajs/react';
import { ArrowRight, BookOpen, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Destination = { label: string; href: string };

// Keep the existing public destinations and filtered Laravel endpoints. No new search API.
const destinations: Destination[] = [
    { label: 'PMP Exam Simulator', href: '/exam-simulator/pmp' },
    { label: 'CSM Exam Simulator', href: '/simulators/scrum' },
    { label: 'Project Simulator', href: '/simulators/project' },
    { label: 'Course Library', href: '/learning' },
    { label: 'Community Feed', href: '/community' },
    { label: 'Daily Challenge', href: '/daily-challenge' },
    { label: 'Members', href: '/members' },
];

const searches = [
    { label: 'Community posts', href: '/community', parameter: 'search' },
    { label: 'Daily Challenge', href: '/daily-challenge', parameter: 'search' },
    { label: 'Members', href: '/members', parameter: 'search' },
] as const;

/** Compact, keyboard-accessible public-home search using existing application routes. */
export function HomeSearch({ onClose }: { onClose: () => void }) {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchText = query.trim().slice(0, 80);
    const matched = searchText
        ? destinations.filter(item => item.label.toLowerCase().includes(searchText.toLowerCase())).slice(0, 4)
        : destinations.filter(item => ['/exam-simulator/pmp', '/learning', '/community', '/daily-challenge'].includes(item.href));

    useEffect(() => {
        inputRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                document.querySelector<HTMLButtonElement>('.pm-v2-search-toggle')?.focus();
            }
        };
        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node) || panelRef.current?.contains(target)) return;
            // Clicking the search toggle is handled by the toggle itself, without reopening.
            if (target instanceof Element && target.closest('.pm-v2-search-toggle')) return;
            onClose();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('pointerdown', handlePointerDown);
        };
    }, [onClose]);

    const closeAndFocus = () => {
        onClose();
        document.querySelector<HTMLButtonElement>('.pm-v2-search-toggle')?.focus();
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchText) return;
        onClose();
        router.get('/community', { search: searchText }, { preserveState: false });
    };

    return (
        <div
            id="pm-v2-header-search"
            ref={panelRef}
            className="pm-v2-header-search"
            role="dialog"
            aria-modal="false"
            aria-labelledby="pm-v2-search-heading"
        >
            <div className="pm-v2-search-title">
                <strong id="pm-v2-search-heading">Search PM Circle</strong>
                <button type="button" onClick={closeAndFocus} aria-label="Close search" className="pm-v2-search-close">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <form onSubmit={submit} role="search" className="pm-v2-search-form">
                <Search size={18} aria-hidden="true" className="pm-v2-search-form-icon" />
                <label className="sr-only" htmlFor="pm-v2-site-search">Search discussions, courses and members</label>
                <input
                    id="pm-v2-site-search"
                    ref={inputRef}
                    type="search"
                    value={query}
                    maxLength={80}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search topics or discussions"
                    autoComplete="off"
                />
                <button type="submit" disabled={!searchText} className="pm-v2-search-submit">
                    <span>Search</span><ArrowRight size={16} aria-hidden="true" />
                </button>
            </form>

            {searchText && (
                <div className="pm-v2-search-group" aria-label="Search destinations">
                    <p className="pm-v2-search-group-heading">Search for “{searchText}” in</p>
                    <div className="pm-v2-search-results">
                        {searches.map(item => (
                            <Link key={item.label} href={`${item.href}?${item.parameter}=${encodeURIComponent(searchText)}`} onClick={onClose}>
                                <Search size={15} aria-hidden="true" />
                                <span>{item.label}</span>
                                <ArrowRight size={14} aria-hidden="true" className="pm-v2-search-result-arrow" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {matched.length > 0 && (
                <div className="pm-v2-search-group" aria-label={searchText ? 'Matching pages' : 'Popular pages'}>
                    <p className="pm-v2-search-group-heading">{searchText ? 'Matching pages' : 'Popular pages'}</p>
                    <div className="pm-v2-search-results">
                        {matched.map(item => (
                            <Link key={item.href} href={item.href} onClick={onClose}>
                                <BookOpen size={15} aria-hidden="true" />
                                <span>{item.label}</span>
                                <ArrowRight size={14} aria-hidden="true" className="pm-v2-search-result-arrow" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
