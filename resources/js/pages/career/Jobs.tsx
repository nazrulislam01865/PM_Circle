import { Head } from '@inertiajs/react';
import { BriefcaseBusiness, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CareerJobCard } from '@/components/career/CareerJobCard';
import { careerJobs, type CareerJob } from '@/data/career-jobs';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

type JobTypeFilter = 'All' | CareerJob['type'];

export default function Jobs() {
    const [search, setSearch] = useState('');
    const [jobType, setJobType] = useState<JobTypeFilter>('All');
    const visibleJobs = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return careerJobs.filter(job =>
            (jobType === 'All' || job.type === jobType) &&
            (!query || `${job.title} ${job.company} ${job.location}`.toLocaleLowerCase().includes(query))
        );
    }, [search, jobType]);

    return <PublicLayout siteLayout active="/careers"><Head title="Career Opportunities"/>
        <div className="pm-trends pm-careers pm-container pm-page">
            <section className="pm-trends-hero" aria-labelledby="pm-careers-title"><div className="pm-trends-hero-content"><div className="pm-trends-hero-text">
                <h1 id="pm-careers-title">Career Opportunities</h1>
                <p>Explore project management positions, employers and experience requirements.</p>
            </div></div></section>
            <div className="pm-career-preview-note" role="note">
                <BriefcaseBusiness size={19} aria-hidden="true"/>
                <p><strong>Sample job listings:</strong> These records are from the supplied example CSV, not live verified vacancies. Images are illustrative. Availability, salaries and requirements must be confirmed with the employer.</p>
            </div>
            <div className="pm-careers-toolbar">
                <label className="pm-careers-search"><Search size={19} aria-hidden="true"/><span className="sr-only">Search jobs</span>
                    <input type="search" placeholder="Search by job title, company or location" value={search} onChange={event => setSearch(event.target.value)}/>
                </label>
                <div className="pm-trends-filters pm-careers-filters" role="group" aria-label="Filter job type">
                    {(['All', 'Full time', 'Contract'] as const).map(type =>
                        <button key={type} type="button" className={`pm-trend-filter${jobType === type ? ' is-selected' : ''}`}
                            aria-pressed={jobType === type} onClick={() => setJobType(type)}>
                            {type === 'All' ? `All (${careerJobs.length})` : type}
                        </button>
                    )}
                </div>
            </div>
            <p className="pm-career-count" role="status">{visibleJobs.length} {visibleJobs.length === 1 ? 'sample position' : 'sample positions'}</p>
            <div className="pm-trend-cards">
                {visibleJobs.length ? visibleJobs.map(job => <CareerJobCard key={job.id} job={job}/>)
                    : <div className="pm-trend-empty">No sample positions match your search. Try another job title, company or location.</div>}
            </div>
        </div>
    </PublicLayout>;
}
