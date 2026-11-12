import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { ScenarioLibraryCard, type LibraryScenario } from '@/components/scenarios/ScenarioLibraryCard';
import { ScenarioLibraryFilters, type ChallengeFilters } from '@/components/scenarios/ScenarioLibraryFilters';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Props = {
    scenarios: {
        data: LibraryScenario[];
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
    };
    topics: { name: string; total: number }[];
    statusCounts: { open: number; closed: number };
    todaySlug: string | null;
    filters: ChallengeFilters;
    canInteract: boolean;
};

const tabs = [
    { id: 'library', label: 'All scenarios' },
    { id: 'open', label: 'Open discussions' },
    { id: 'discussed', label: 'Most discussed' },
    { id: 'mine', label: 'My participation' },
] as const;

function visiblePages(current: number, last: number): (number | '…')[] {
    if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, '…', last];
    if (current >= last - 2) return [1, '…', last - 4, last - 3, last - 2, last - 1, last];
    return [1, '…', current - 1, current, current + 1, '…', last];
}

export default function Index({ scenarios, topics, statusCounts, todaySlug, filters, canInteract }: Props) {
    const page = usePage<{ auth: { user: { id: number } | null } }>();
    const memberView = page.url.split('?')[0] === '/dashboard/daily-challenge';
    const libraryRoot = memberView ? '/dashboard/daily-challenge' : '/daily-challenge';
    const { auth } = page.props;
    const [search, setSearch] = useState(filters.search);
    const [joinAction, setJoinAction] = useState<string | null>(null);
    useEffect(() => setSearch(filters.search), [filters.search]);

    const navigate = (changes: Partial<ChallengeFilters>, page?: number) => {
        const next = { ...filters, ...changes };
        router.get(libraryRoot, {
            ...Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== '' && value !== 'all' && !(key === 'tab' && value === 'library') && !(key === 'sort' && value === 'latest'))),
            ...(page && page > 1 ? { page } : {}),
        }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        navigate({ search: search.trim() });
    };

    return <PublicLayout siteLayout={!memberView} active="/daily-challenge" joinLabel="Join free">
        <Head title="Scenario Library · PM Circle" />
        <div className="pm-challenge-page">
            <div className="pm-container pm-challenge-container">
                <div className="pm-challenge-heading-row">
                    <div><h1>Scenario Library</h1><p>Real project scenarios to think, decide, and learn together.</p></div>
                    {todaySlug && <Link className="pm-challenge-today-link" href={`${memberView ? libraryRoot : '/scenarios'}/${encodeURIComponent(todaySlug)}`}>Today's scenario <ArrowRight size={18} aria-hidden="true" /></Link>}
                </div>
                <div className="pm-challenge-tabs" role="group" aria-label="Scenario views">
                    {tabs.map(({ id, label }) => <button key={id} type="button" className={`pm-challenge-tab ${filters.tab === id ? 'is-active' : ''}`} aria-pressed={filters.tab === id} onClick={() => navigate({ tab: id, status: 'all' })}>
                        {label}
                    </button>)}
                </div>
                <div className="pm-challenge-layout">
                    <ScenarioLibraryFilters filters={filters} topics={topics} statusCounts={statusCounts} onChange={navigate} onReset={() => { setSearch(''); navigate({ tab: 'library', search: '', topic: '', status: 'all', time: 'all', sort: 'latest' }); }}/>
                    <section className="pm-challenge-results" aria-label="Scenarios">
                        <div className="pm-challenge-toolbar">
                            <form className="pm-challenge-search" role="search" onSubmit={submitSearch}>
                                <Search size={20} aria-hidden="true" />
                                <input name="search" type="search" aria-label="Search scenarios" placeholder="Search scenarios" maxLength={80} value={search} onChange={event => setSearch(event.target.value)} />
                            </form>
                            <div className="pm-challenge-sort-wrap"><select aria-label="Sort scenarios" value={filters.sort} onChange={event => navigate({ sort: event.target.value as ChallengeFilters['sort'] })}>
                                <option value="latest">Latest first</option>
                                <option value="oldest">Oldest first</option>
                                <option value="discussed">Most discussed</option>
                            </select><ChevronDown size={18} aria-hidden="true" /></div>
                        </div>
                        <div className="pm-challenge-results-list">
                            {scenarios.data.map(scenario => <ScenarioLibraryCard key={scenario.id} scenario={scenario} featured={scenario.slug === todaySlug && scenario.status === 'published'} canInteract={canInteract} onJoin={() => setJoinAction('like or save this scenario')} hrefBase={memberView ? libraryRoot : '/scenarios'} />)}
                            {scenarios.data.length === 0 && <div className="pm-challenge-empty">
                                <h2>{filters.tab === 'mine' && !auth?.user ? 'Sign in to see your participation' : 'No matching scenarios'}</h2>
                                <p>{filters.tab === 'mine' && !auth?.user ? 'Create an account or log in to track the challenges you respond to.' : 'Try a different topic, search, or time filter.'}</p>
                                <button type="button" className="pm-button pm-button-outline" onClick={() => { setSearch(''); navigate({ tab: 'library', search: '', topic: '', status: 'all', time: 'all', sort: 'latest' }); }}>Reset Filters</button>
                            </div>}
                        </div>
                        <div className="pm-challenge-pagination">
                            <p>Showing {scenarios.from ?? 0}–{scenarios.to ?? 0} of {scenarios.total} scenarios</p>
                            {scenarios.last_page > 1 && <nav className="pm-challenge-page-links" aria-label="Scenario pages">
                                <button type="button" aria-label="Previous page" disabled={scenarios.current_page === 1} onClick={() => navigate({}, scenarios.current_page - 1)}><ChevronLeft size={19} /></button>
                                {visiblePages(scenarios.current_page, scenarios.last_page).map((page, index) => page === '…' ? <span key={`gap-${index}`} className="pm-challenge-page-ellipsis">…</span> :
                                    <button type="button" key={page} aria-label={`Page ${page}`} aria-current={scenarios.current_page === page ? 'page' : undefined} className={scenarios.current_page === page ? 'is-active' : ''} onClick={() => navigate({}, page)}>{page}</button>)}
                                <button type="button" aria-label="Next page" disabled={scenarios.current_page === scenarios.last_page} onClick={() => navigate({}, scenarios.current_page + 1)}><ChevronRight size={19} /></button>
                            </nav>}
                        </div>
                    </section>
                </div>
            </div>
        </div>
        <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={!!auth?.user}/>
    </PublicLayout>;
}
