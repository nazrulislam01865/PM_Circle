import { Link } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    ArrowRight, BookOpen, ChartNoAxesColumnIncreasing, ChevronLeft, ChevronRight,
    ClipboardCheck, Compass, Layers3, MessageCircle, Users,
    type LucideIcon,
} from 'lucide-react';
import type { HomePathwayContent } from '@/types/home';
import { HomeContentIcon, type HomepageIconAssets } from '@/components/home/HomeContentIcon';

/** Known icon keys are mapped to the existing icon library; content is supplied by Laravel. */
const icons: Record<string, LucideIcon> = {
    direction: Compass,
    learn: BookOpen,
    exams: ClipboardCheck,
    skills: ChartNoAxesColumnIncreasing,
    community: Users,
    pmp: ClipboardCheck,
    scrum: Layers3,
    simulation: Layers3,
};

function CareerSteps({ content, iconAssets }: { content: HomePathwayContent['steps']; iconAssets?: HomepageIconAssets }) {
    return <section className="pm-pathway-steps" aria-labelledby="pm-pathway-title">
        <h2 id="pm-pathway-title">{content.heading}</h2>
        <div className="pm-pathway-steps-grid">
            {content.items.map((item, index) => {
                const Icon = icons[item.icon] ?? Compass;
                return <div className="pm-pathway-step" key={`${item.title}-${index}`}>
                    <HomeContentIcon category="pathway_step_icon" icon={item.icon} assets={iconAssets} fallback={Icon} size={36} strokeWidth={1.8}/>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                </div>;
            })}
        </div>
    </section>;
}

function ExamCarousel({ content, iconAssets }: { content: HomePathwayContent['exams']; iconAssets?: HomepageIconAssets }) {
    const scroller = useRef<HTMLDivElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const items = content.items;

    function goTo(index: number) {
        if (!items.length) return;
        const next = (index + items.length) % items.length;
        const viewport = scroller.current;
        const card = viewport?.children.item(next) as HTMLElement | null;
        const firstCard = viewport?.firstElementChild as HTMLElement | null;
        if (viewport && card && firstCard) {
            viewport.scrollTo({ left: card.offsetLeft - firstCard.offsetLeft, behavior: 'smooth' });
        }
        setActiveIndex(next);
    }

    function onScroll() {
        const viewport = scroller.current;
        if (!viewport || items.length < 2) return;
        const maxScroll = viewport.scrollWidth - viewport.clientWidth;
        if (maxScroll <= 0) return;
        setActiveIndex(Math.min(items.length - 1, Math.round(viewport.scrollLeft / maxScroll * (items.length - 1))));
    }

    return <section className="pm-pathway-exams" aria-labelledby="pm-pathway-exams-title">
        <div className="pm-pathway-exams-heading">
            <div>
                <h2 id="pm-pathway-exams-title">{content.heading}</h2>
                <p>{content.description}</p>
            </div>
            <Link href="/pricing" className="pm-pathway-compare">{content.compare_label} <ArrowRight aria-hidden="true" size={19}/></Link>
        </div>
        {items.length > 0 && <>
            <div className="pm-pathway-carousel-shell">
                <button type="button" className="pm-pathway-arrow" aria-label="Previous exam simulator" onClick={() => goTo(activeIndex - 1)}>
                    <ChevronLeft size={23} aria-hidden="true" />
                </button>
                <div className="pm-pathway-carousel-track" ref={scroller} onScroll={onScroll} aria-label="Exam simulators" role="region" tabIndex={0}>
                    {items.map((item, index) => {
                        const Icon = icons[item.icon] ?? Layers3;
                        return <article className="pm-pathway-exam-card" key={`${item.title}-${index}`}>
                            <div className="pm-pathway-exam-intro">
                                <HomeContentIcon category="pathway_exam_icon" icon={item.icon} assets={iconAssets} fallback={Icon} size={39} strokeWidth={1.85}/>
                                <div><h3>{item.title}</h3><p>{item.description}</p></div>
                            </div>
                            <div className="pm-pathway-exam-pills" aria-label="Practice features">
                                {item.features.map(feature => <span key={feature}>{feature}</span>)}
                            </div>
                            <div className="pm-pathway-exam-actions">
                                <Link href="/learning" className="pm-button pm-button-sm">{item.button_label}<ArrowRight aria-hidden="true" size={18}/></Link>
                                <Link href="/pricing" className="pm-pathway-plan-link">{item.plans_label}</Link>
                            </div>
                        </article>;
                    })}
                </div>
                <button type="button" className="pm-pathway-arrow" aria-label="Next exam simulator" onClick={() => goTo(activeIndex + 1)}>
                    <ChevronRight size={23} aria-hidden="true" />
                </button>
            </div>
            <div className="pm-pathway-carousel-footer" aria-label="Carousel navigation">
                <div className="pm-pathway-dots">
                    {items.map((item, index) => <button key={`${item.title}-${index}`} type="button"
                        aria-label={`Show exam simulator ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined}
                        onClick={() => goTo(index)} className={index === activeIndex ? 'is-active' : ''}/>) }
                </div>
                <span className="pm-pathway-footer-divider" aria-hidden="true" />
                <span>{content.more_label}</span>
            </div>
        </>}
    </section>;
}

function ProfessionalSkillsBanner({ content }: { content: HomePathwayContent['banner'] }) {
    return <section className="pm-pathway-banner" aria-label="Professional skills">
        <MessageCircle aria-hidden="true" className="pm-pathway-banner-icon" size={38} strokeWidth={1.8}/>
        <div className="pm-pathway-banner-copy">
            <h2>{content.heading}</h2>
            <p>{content.description}</p>
        </div>
        <Link href="/learning" className="pm-button pm-button-outline pm-pathway-banner-button">
            {content.button_label}<ArrowRight size={18} aria-hidden="true" />
        </Link>
    </section>;
}

/** Replaces the former statistics panel; the remaining homepage is untouched. */
export function HomePathway({ content, iconAssets }: { content?: HomePathwayContent; iconAssets?: HomepageIconAssets }) {
    if (!content) return null;
    return <div className="pm-pathway-band"><div className="pm-pathway-container">
        <CareerSteps content={content.steps} iconAssets={iconAssets}/>
        <ExamCarousel content={content.exams} iconAssets={iconAssets}/>
        <ProfessionalSkillsBanner content={content.banner}/>
    </div></div>;
}
