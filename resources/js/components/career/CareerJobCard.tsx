import { Link } from '@inertiajs/react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, MapPin, Wallet } from 'lucide-react';
import { careerJobHref, formatCareerJobDate, formatCareerJobSalary, type CareerJob } from '@/data/career-jobs';

/** Reuse the existing PM Trends horizontal card layout and shared styles. */
export function CareerJobCard({ job }: { job: CareerJob }) {
    const href = careerJobHref(job.id);

    return <article className="pm-trend-card pm-career-card">
        <Link className="pm-trend-image-link" href={href} aria-label={`View ${job.title} at ${job.company}`}>
            <img src={job.image} alt="" loading="lazy" width="250" height="96"/>
        </Link>
        <div className="pm-trend-card-content">
            <div className="pm-trend-badges">
                <span className="pm-trend-badge is-muted">External listing · {job.source}</span>
                {job.type !== 'Not specified' && <span className="pm-trend-badge is-blue">{job.type}</span>}
            </div>
            <h2><Link href={href}>{job.title}</Link></h2>
            <p className="pm-career-company">{job.company}</p>
            <div className="pm-trend-meta pm-career-meta">
                <span><MapPin aria-hidden="true"/>{job.location}</span>
                <span><CalendarDays aria-hidden="true"/>{formatCareerJobDate(job.posted)}</span>
                {job.experience && <span><BriefcaseBusiness aria-hidden="true"/>{job.experience}</span>}
                {job.salary && <span><Wallet aria-hidden="true"/>{formatCareerJobSalary(job)}</span>}
            </div>
        </div>
        <Link className="btn small pm-trend-read" href={href}>View Details <ArrowRight size={17} aria-hidden="true"/></Link>
    </article>;
}
