import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BriefcaseBusiness, CalendarDays, ExternalLink, Home, Info, MapPin, Wallet, Users } from 'lucide-react';
import { formatCareerJobDate, formatCareerJobSalary, type CareerJob } from '@/data/career-jobs';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function Show({ job }: { job: CareerJob }) {
    return <PublicLayout siteLayout active="/careers"><Head title={`${job.title} | ${job.company}`}/>
        <div className="pm-trends pm-careers pm-container pm-page pm-career-details-page">
            <nav className="pm-crumbs pm-trend-breadcrumb" aria-label="Breadcrumb">
                <Link href="/"><Home size={17} aria-hidden="true"/><span className="sr-only">Home</span></Link>
                <span aria-hidden="true">/</span><Link href="/careers">Careers</Link><span aria-hidden="true">/</span><span aria-current="page">Job details</span>
            </nav>
            <article className="pm-panel pm-career-detail">
                <div className="pm-trend-badges"><span className="pm-trend-badge is-muted">External listing · {job.source}</span>{job.type !== 'Not specified' && <span className="pm-trend-badge is-blue">{job.type}</span>}</div>
                <h1>{job.title}</h1>
                <p className="pm-career-detail-company">{job.company}</p>
                <div className="pm-career-detail-facts" aria-label="Job details">
                    <div><MapPin aria-hidden="true"/><span><small>Location</small><strong>{job.location}</strong></span></div>
                    <div><CalendarDays aria-hidden="true"/><span><small>Posted</small><strong>{formatCareerJobDate(job.posted)}</strong></span></div>
                    <div><BriefcaseBusiness aria-hidden="true"/><span><small>Experience</small><strong>{job.experience ?? 'Not specified'}</strong></span></div>
                    <div><Wallet aria-hidden="true"/><span><small>Salary</small><strong>{formatCareerJobSalary(job)}</strong></span></div>
                    {job.vacancies != null && <div><Users aria-hidden="true"/><span><small>Vacancies</small><strong>{job.vacancies}</strong></span></div>}
                    <div><BriefcaseBusiness aria-hidden="true"/><span><small>Employment type</small><strong>{job.type}</strong></span></div>
                </div>
                <section className="pm-career-detail-section" aria-labelledby="job-description-title">
                    <h2 id="job-description-title">Job description</h2>
                    {job.description ? <p className="pm-career-description">{job.description}</p>
                        : <p>The job source did not provide a description. Review the original posting for complete responsibilities and qualifications.</p>}
                </section>
                <aside className="pm-career-detail-notice"><Info size={20} aria-hidden="true"/><p>This listing is sourced automatically from {job.source}. PM Circle does not independently verify openings or accept applications. Confirm details with the employer.</p></aside>
                <div className="pm-career-detail-actions">
                    <Link href="/careers" className="btn secondary"><ArrowLeft size={17} aria-hidden="true"/> Back to all jobs</Link>
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn small">View original listing <ExternalLink size={17} aria-hidden="true"/></a>
                </div>
            </article>
        </div>
    </PublicLayout>;
}
