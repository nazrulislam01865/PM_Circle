import { Link } from '@inertiajs/react';
import { BriefcaseBusiness, MapPin, ShieldCheck } from 'lucide-react';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';

// Explicitly illustrative positions from the supplied homepage prototype.
const examples = [
    { title: 'IT Project Manager', company: 'Technology company', location: 'Remote', arrangement: 'Full time' },
    { title: 'PMO Analyst', company: 'Consulting firm', location: 'Hybrid', arrangement: 'Full time' },
    { title: 'Scrum Master', company: 'Product team', location: 'Remote', arrangement: 'Full time' },
];
export default function Jobs({ demo }: { demo: boolean }) {
    return <ContentPage title="Career opportunities" subtitle="Explore project management roles and build your next career step.">
        {demo ? <><p className="pm-feature-privacy">Illustrative vacancies from the approved homepage prototype — not live job openings. Applications are not enabled yet.</p>
            <div className="pm-feature-jobs">{examples.map(item => <article className="pm-panel pm-feature-job" key={item.title}><BriefcaseBusiness size={26}/><div><h2>{item.title}</h2><p>{item.company}</p><small><MapPin size={14}/>{item.location} · {item.arrangement}</small></div><span>Demo position</span></article>)}</div></>
        : <FeatureEmpty title="No published job openings" description="Verified, moderated job listings will appear here when recruitment features are available." href="/learning" linkLabel="Build your next skill"/>}
        <section className="pm-panel pm-feature-section"><h2>Prepare for your next role</h2><p>Develop project-management skills, review learning paths and share your experience with the community.</p><Link href="/learning" className="pm-button pm-button-sm mt-4">Explore learning paths</Link></section>
        <p className="pm-feature-privacy"><ShieldCheck size={18}/> Private resumes and candidate information are not visible on this public page.</p>
    </ContentPage>;
}
