import { Link } from '@inertiajs/react';
import { BookOpen, BriefcaseBusiness, ChartNoAxesColumnIncreasing, ChevronRight, FileText, MessagesSquare, Sparkles, Users } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { SectionHead } from '@/components/pm/SectionHead';
import type { HomeContent, HomePerson } from '@/types/home';
import { HomeContentIcon, type HomepageIconAssets } from '@/components/home/HomeContentIcon';

const featureIcons = {
    learn: BookOpen,
    discuss: MessagesSquare,
    jobs: BriefcaseBusiness,
    resume: FileText,
};

const opportunityIcons = { manager: BriefcaseBusiness, analyst: ChartNoAxesColumnIncreasing, scrum: Users };

export function CareerHighlights({ content, people, demo, iconAssets }: { content?: HomeContent['careers']; people: HomePerson[]; demo: boolean; iconAssets?: HomepageIconAssets }) {
    if (!content) return null;
    return <section className="pm-feature-section"><div className="pm-container">
        <h2>{content.heading}</h2>
        <div className="pm-features">{content.features.map(feature => {
            const Icon = featureIcons[feature.icon as keyof typeof featureIcons] ?? BookOpen;
            const destination = feature.url;
            return <Link href={destination} className="pm-panel pm-feature" key={feature.title}><HomeContentIcon category="careers_feature_icon" icon={feature.icon} assets={iconAssets} fallback={Icon}/><div><strong>{feature.title}</strong><p>{feature.description}</p></div></Link>;
        })}</div>
        <div className="pm-career-grid">
            <section className="pm-sidebar-panel pm-panel"><SectionHead href="/careers" linkText={content.jobs_view_all_label ?? "View all jobs"}>{content.opportunities_heading}</SectionHead>
                {!demo && content.show_sample_opportunities && <p className="pm-empty">Illustrative examples · Not verified job vacancies.</p>}
                {(demo || content.show_sample_opportunities) && content.opportunities.length > 0 ? content.opportunities.map(job => {
                    const JobIcon = opportunityIcons[job.icon as keyof typeof opportunityIcons] ?? BriefcaseBusiness;
                    return <Link href="/careers" className="pm-job-row" key={`${job.role}:${job.company}`}>
                    <HomeContentIcon category="careers_opportunity_icon" icon={job.icon ?? 'manager'} assets={iconAssets} fallback={JobIcon} className="pm-job-icon" size={24}/><span className="pm-job-desc"><strong>{job.role}</strong><small>{job.company}</small></span>
                    <span className="pm-job-chip">{job.location}</span><span className="pm-job-chip">{job.type}</span><ChevronRight size={16}/>
                </Link>;
                }) : <p className="pm-empty">{content.empty_message ?? 'Verified job opportunities will appear here when the careers module is launched.'}</p>}
            </section>
            <section className="pm-promo"><Sparkles size={28} color="var(--pm-primary)"/><div className="pm-promo-inner"><div>
                <h3>{content.resume.title}</h3><p>{content.resume.description}</p>
                <Link href="/careers" className="pm-button pm-button-sm">{content.resume.button_label}</Link>
            </div><div className="pm-resume-illustration" aria-hidden="true"><FileText size={50}/><span/><span/><span/><span/></div></div></section>
        </div>
        <div className="pm-bottom-cta pm-panel">
            <div className="pm-bottom-faces">{people.slice(1, 4).map(person => <Avatar key={person.name} name={person.name} src={person.avatar_path} size={49}/>)}<span className="pm-plus-face"><Users size={20}/></span></div>
            <div><h2>{content.join.heading}</h2><p>{content.join.description}</p></div>
            <div className="pm-bottom-action"><Link href="/register" className="pm-button">{content.join.button_label}</Link><small>{content.join.hint}</small></div>
        </div>
    </div></section>;
}
