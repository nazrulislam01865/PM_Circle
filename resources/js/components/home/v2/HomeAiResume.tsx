import { Link } from '@inertiajs/react';
import { ArrowUpFromLine, FileText, Pencil, Save } from 'lucide-react';
import type { HomepagePresentation } from '@/types/homepage-presentation';
import { HomePhoto } from './HomePhoto';
import { HomeAction, HomeSectionTitle } from './HomeUi';
const stepIcons = {upload:ArrowUpFromLine,edit:Pencil,report:FileText,save:Save};

export function HomeAiPractice({ content }: { content: HomepagePresentation['ai_features'] }) {
    return <section className="pm-v2-section pm-v2-container pm-v2-ai-section" id="pm-v2-ai" aria-labelledby="pm-v2-ai-title">
        <HomeSectionTitle id="pm-v2-ai-title" title={content.heading} description={content.description} action={content.button_label} href={content.button_url}/>
        <div className="pm-v2-ai-grid">{content.cards.map((card, i) => <Link href={card.href} className="pm-v2-image-card pm-v2-ai-card" key={i}>
            <HomePhoto photo={card.photo} alt="" className="pm-v2-card-image" source={card.image}/>
            <div className="pm-v2-card-content"><h3>{card.title}</h3><p>{card.description}</p></div>
        </Link>)}</div>
    </section>;
}

export function HomeResume({ content }: { content: HomepagePresentation['resume'] }) {
    return <section className="pm-v2-resume-section" aria-labelledby="pm-v2-resume-title"><div className="pm-v2-container pm-v2-resume-grid">
        <div className="pm-v2-resume-panel"><div className="pm-v2-resume-icon">{content.image ? <img src={content.image} alt=""/> : <FileText aria-hidden="true"/>}</div>
            <h2 id="pm-v2-resume-title">{content.title}</h2><p>{content.description}</p><span>{content.note}</span>
            <HomeAction href={content.button_url} primary>{content.button_label}</HomeAction>
        </div>
        <div className="pm-v2-resume-flow"><h3>{content.flow_heading}</h3><div className="pm-v2-resume-steps">
            {content.steps.map((step,i) => {const Icon=stepIcons[step.icon]; return <div className="pm-v2-resume-step" key={i}>
                <div className="pm-v2-resume-step-icon"><Icon aria-hidden="true"/></div><div><strong>{step.title}</strong><p>{step.description}</p></div>
            </div>;})}
        </div></div>
    </div></section>;
}
