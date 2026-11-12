import { Link } from '@inertiajs/react';
import { BookOpen, BriefcaseBusiness, ChevronRight, FileText, MessagesSquare, Sparkles, Users } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { SectionHead } from '@/components/pm/SectionHead';
import type { HomeContent, HomePerson, HomeCareerJob } from '@/types/home';
import { HomeContentIcon, type HomepageIconAssets } from '@/components/home/HomeContentIcon';

const featureIcons = {
    learn: BookOpen,
    discuss: MessagesSquare,
    jobs: BriefcaseBusiness,
    resume: FileText,
};

export function CareerHighlights({ content, people, iconAssets, jobs, showFeatures = true, showRest = true }: { content?: HomeContent['careers']; people: HomePerson[]; demo: boolean; jobs: HomeCareerJob[]; iconAssets?: HomepageIconAssets; showFeatures?: boolean; showRest?: boolean }) {
    if (!content || (!showFeatures && !showRest)) return null;
    return <section className="pm-feature-section"><div className="pm-container">
        {showFeatures && <><h2>{content.heading}</h2>
        <div className="pm-features">{content.features.map(feature => {
            const Icon = featureIcons[feature.icon as keyof typeof featureIcons] ?? BookOpen;
            const destination = feature.url;
            return <Link href={destination} className="pm-panel pm-feature" key={feature.title}><HomeContentIcon category="careers_feature_icon" icon={feature.icon} image={feature.icon_image} assets={iconAssets} fallback={Icon} size={36}/><div><strong>{feature.title}</strong><p>{feature.description}</p></div></Link>;
        })}</div></>}
        {showRest && <><div className="pm-career-grid">
            <section className="pm-sidebar-panel pm-panel"><SectionHead href={content.jobs_url || '/careers'} linkText={content.jobs_view_all_label ?? "View all jobs"}>{content.opportunities_heading}</SectionHead>
                {jobs.length ? jobs.slice(0, 3).map(job => <Link href={`/careers/${encodeURIComponent(job.slug)}`} className="pm-job-row" key={job.slug}>
                    <BriefcaseBusiness aria-hidden="true" className="pm-job-icon" size={36}/>
                    <span className="pm-job-desc"><strong>{job.title}</strong><small>{job.company}</small></span>
                    <span className="pm-job-chip">{job.location}</span><span className="pm-job-chip">{job.type}</span><ChevronRight size={16}/>
                </Link>) : <p className="pm-empty">{content.empty_message ?? 'No current job listings are available.'}</p>}
            </section>
            <section className="pm-promo">{content.resume.icon_image ? <img src={content.resume.icon_image} className="pm-home-custom-icon" width={36} height={36} alt="" aria-hidden="true"/> : <Sparkles size={28} color="var(--pm-primary)"/>}<div className="pm-promo-inner"><div>
                <h3>{content.resume.title}</h3><p>{content.resume.description}</p>
                <Link href={content.resume.button_url || '/careers'} className="pm-button pm-button-sm">{content.resume.button_label}</Link>
            </div><div className="pm-resume-illustration" aria-hidden="true"><FileText size={50}/><span/><span/><span/><span/></div></div></section>
        </div>
        <div className="pm-bottom-cta pm-panel">
            <div className="pm-bottom-faces">{people.slice(1, 4).map(person => <Avatar key={person.name} name={person.name} src={person.avatar_path} size={49}/>)}<span className="pm-plus-face"><Users size={20}/></span></div>
            <div><h2>{content.join.heading}</h2><p>{content.join.description}</p></div>
            <div className="pm-bottom-action"><Link href={content.join.button_url || '/register'} className="pm-button">{content.join.button_label}</Link><small>{content.join.hint}</small></div>
        </div></>}
    </div></section>;
}
