import { Head, Link, router } from '@inertiajs/react';
import { BriefcaseBusiness, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { CareerJobCard } from '@/components/career/CareerJobCard';
import type { CareerJob } from '@/data/career-jobs';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type Props = {
    jobs: { data: CareerJob[]; currentPage: number; hasMore: boolean };
    filters: { q: string; type: string };
};

const jobTypes = ['All', 'Full time', 'Contract', 'Part time', 'Internship', 'Temporary', 'Per diem', 'Volunteer', 'Other'] as const;

export default function Jobs({ jobs, filters }: Props) {
    const [search, setSearch] = useState(filters.q);
    useEffect(() => setSearch(filters.q), [filters.q]);
    const activeType = filters.type || 'All';

    const navigate = (query: string, type: string, page = 1) => {
        router.get('/careers', { ...(query.trim() ? { q: query.trim() } : {}), ...(type !== 'All' ? { type } : {}), ...(page > 1 ? { page } : {}) }, {
            preserveState: true,
            preserveScroll: true,
            replace: page === 1,
        });
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        navigate(search, activeType);
    };

    const pageUrl = (page: number) => {
        const params = new URLSearchParams();
        if (filters.q) params.set('q', filters.q);
        if (filters.type) params.set('type', filters.type);
        if (page > 1) params.set('page', String(page));
        const qs = params.toString();
        return `/careers${qs ? `?${qs}` : ''}`;
    };

    return <PublicLayout siteLayout active="/careers"><Head title="Career Opportunities"/>
        <div className="pm-trends pm-careers pm-container pm-page">
            <section className="pm-trends-hero" aria-labelledby="pm-careers-title"><div className="pm-trends-hero-content"><div className="pm-trends-hero-text">
                <h1 id="pm-careers-title">Career Opportunities</h1>
                <p>Explore project management positions, employers and experience requirements.</p>
            </div></div></section>
            <div className="pm-career-preview-note" role="note">
                <BriefcaseBusiness size={19} aria-hidden="true"/>
                <p><strong>Jobs from external sources:</strong> Listings are imported automatically and may change or close. Check the employer's original posting before applying.</p>
            </div>
            <div className="pm-careers-toolbar">
                <form className="pm-careers-search" role="search" onSubmit={submitSearch}>
                    <Search size={19} aria-hidden="true"/>
                    <label className="sr-only" htmlFor="pm-careers-keywords">Search jobs</label>
                    <input id="pm-careers-keywords" type="search" placeholder="Search by title, company or location" value={search} onChange={event => setSearch(event.target.value)}/>
                    <button type="submit" className="btn small pm-careers-search-submit">Search</button>
                </form>
                <div className="pm-trends-filters pm-careers-filters" role="group" aria-label="Filter job type">
                    {jobTypes.map(type =>
                        <button key={type} type="button" className={`pm-trend-filter${activeType === type ? ' is-selected' : ''}`}
                            aria-pressed={activeType === type} onClick={() => navigate(search, type)}>
                            {type}
                        </button>
                    )}
                </div>
            </div>
            <p className="pm-career-count" role="status">{jobs.data.length} {jobs.data.length === 1 ? 'position' : 'positions'} on this page</p>
            <div className="pm-trend-cards">
                {jobs.data.length ? jobs.data.map(job => <CareerJobCard key={job.id} job={job}/>)
                    : <div className="pm-trend-empty">No current listings match your search. Try another title, company or location.</div>}
            </div>
            {(jobs.currentPage > 1 || jobs.hasMore) && <nav className="pm-careers-pagination" aria-label="Careers pages">
                {jobs.currentPage > 1 && <Link className="btn secondary" href={pageUrl(jobs.currentPage - 1)}>Previous</Link>}
                <span>Page {jobs.currentPage}</span>
                {jobs.hasMore && <Link className="btn secondary" href={pageUrl(jobs.currentPage + 1)}>Next</Link>}
            </nav>}
        </div>
    </PublicLayout>;
}
