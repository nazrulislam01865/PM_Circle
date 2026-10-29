import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, BriefcaseBusiness, ChevronRight, FileText, MessagesSquare, Sparkles, Users } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { SectionHead } from '@/components/pm/SectionHead';

const features = [
    { title: 'Learn & practise', text: 'Daily scenarios, PMP and Scrum practice', to: '/learning', icon: BookOpen },
    { title: 'Share & discuss', text: 'Practical lessons from real projects', to: '/community', icon: MessagesSquare },
    { title: 'Find your next role', text: 'Relevant jobs for project professionals', to: '/careers', icon: BriefcaseBusiness },
    { title: 'Tell your story better', text: 'AI resume support for your project experience', to: '/careers', icon: FileText },
];
const opportunities = [
    { role: 'IT Project Manager', company: 'Technology company', location: 'Remote', type: 'Full time' },
    { role: 'PMO Analyst', company: 'Consulting firm', location: 'Hybrid', type: 'Full time' },
    { role: 'Scrum Master', company: 'Product team', location: 'Remote', type: 'Full time' },
];
export function CareerHighlights({ demo }: { demo: boolean }) {
    return <section className="pm-feature-section"><div className="pm-container">
        <h2>Everything your PM career needs, in one circle.</h2>
        <div className="pm-features">{features.map(feature => <Link href={feature.to} className="pm-panel pm-feature" key={feature.title}><feature.icon/><div><strong>{feature.title}</strong><p>{feature.text}</p></div></Link>)}</div>
        <div className="pm-career-grid"><section className="pm-sidebar-panel pm-panel"><SectionHead href="/careers" linkText="View all jobs">Latest opportunities</SectionHead>
            {demo ? opportunities.map(job => <Link href="/careers" className="pm-job-row" key={job.role}><BriefcaseBusiness className="pm-job-icon" size={24}/><span className="pm-job-desc"><strong>{job.role}</strong><small>{job.company}</small></span><span className="pm-job-chip">{job.location}</span><span className="pm-job-chip">{job.type}</span><ChevronRight size={16}/></Link>) : <p className="pm-empty">Verified job opportunities will appear here once the careers module is launched.</p>}
        </section><section className="pm-promo"><Sparkles size={28} color="var(--pm-primary)"/><div className="pm-promo-inner"><div><h3>Your experience deserves<br/>a clearer resume.</h3><p>Turn projects, responsibilities and outcomes into a focused PM resume.</p><Link href="/careers" className="pm-button pm-button-sm">Explore AI resume assistant</Link></div><div className="pm-resume-illustration" aria-hidden="true"><FileText size={50}/><span/><span/><span/><span/></div></div></section></div>
        <div className="pm-bottom-cta pm-panel"><div className="pm-bottom-faces"><Avatar name="Community Top" size={49}/><Avatar name="Community Bottom" size={49}/><Avatar name="Community Lower Right" size={49}/><span className="pm-plus-face">+</span></div><div><h2>Don’t just manage projects.<br/>Grow with people who do.</h2><p>Start with one discussion, one lesson, one connection.</p></div><div className="pm-bottom-action"><Link href="/register" className="pm-button">Become a member — free</Link><small>For aspiring PMs, experienced practitioners, trainers and leaders.</small></div></div>
    </div></section>;
}
