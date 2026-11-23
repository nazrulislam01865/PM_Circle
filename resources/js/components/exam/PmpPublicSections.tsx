import { Link } from '@inertiajs/react';
import {
    Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, ExternalLink,
    Layers3, Sparkles,
} from 'lucide-react';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { PmpPublicContent, PmpFeature } from '@/types/pmp-public';
import { PmpPublicIcon } from './PmpPublicIcon';
import { PmpPublicSampleExam } from './PmpPublicSampleExam';
import type { ExamQuestion } from './ExamShared';

function SectionCard({ id, className = '', children }: { id?: string; className?: string; children: ReactNode }) {
    return <section id={id} className={`pm-pmp-public-card ${className}`.trim()}>{children}</section>;
}

function FeatureCards({ cards }: { cards: PmpFeature[] }) {
    return <div className="pm-pmp-public-benefit-grid">{cards.map((item, index) =>
        <article className="pm-pmp-public-benefit" key={`${item.title}-${index}`}>
            <h3><PmpPublicIcon icon={item.icon} image={item.icon_image} size={32}/>{item.title}</h3>
            <p>{item.description}</p>
        </article>)}</div>;
}

export function PmpPublicHero({ content }: { content: PmpPublicContent['hero'] }) {
    return <>
        <nav className="pm-pmp-public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/exam-simulator/pmp">Exam Simulator</Link><span aria-hidden="true">/</span><span aria-current="page">PMP</span></nav>
        <section className="pm-pmp-public-hero" aria-labelledby="pm-pmp-public-title">
            {content.image && <img className="pm-pmp-public-hero-image" src={content.image} width="947" height="432" alt="A learner preparing for an exam and a professional celebrating a result" decoding="async" fetchPriority="high"/>}
            <div className="pm-pmp-public-hero-copy">
                <h1 id="pm-pmp-public-title">{content.title.split('®').map((part, index) => <Fragment key={index}>{index > 0 && <sup>®</sup>}{part}</Fragment>)}</h1>
                <p>{content.description}</p>
                <div className="pm-pmp-public-actions">
                    <Link className="pm-pmp-public-button is-primary" href="/pricing">{content.primary_label}</Link>
                    <a className="pm-pmp-public-button is-outline" href="#sample-question">{content.secondary_label}</a>
                </div>
            </div>
        </section>
    </>;
}

export function PmpPublicBenefits({ content }: { content: PmpPublicContent['benefits'] }) {
    return <section className="pm-pmp-public-benefits" aria-labelledby="pm-pmp-benefits-title">
        <h2 id="pm-pmp-benefits-title">{content.heading}</h2>
        <FeatureCards cards={content.cards}/>
    </section>;
}

export function PmpPublicSampleStudy({ sample, ai, sampleQuestion, sampleQuestions, sampleDurationSeconds }: { sample: PmpPublicContent['sample'] | null; ai: PmpPublicContent['ai'] | null; sampleQuestion: ExamQuestion | null; sampleQuestions: ExamQuestion[]; sampleDurationSeconds: number }) {
    return <>
        {sample && <SectionCard id="sample-question" className="pm-pmp-public-study-card">
            <div className="pm-pmp-public-study-column">
                <h2>{sample.icon_image ? <img className="pm-pmp-public-icon-image" width="32" height="32" src={sample.icon_image} alt="" aria-hidden="true"/> : <ClipboardCheck aria-hidden="true"/>}{sample.heading}</h2>
                <p className="pm-pmp-public-section-note">{sample.description}</p>
                <PmpPublicSampleExam sampleQuestion={sampleQuestion} sampleQuestions={sampleQuestions} sampleDurationSeconds={sampleDurationSeconds}/>
            </div>
        </SectionCard>}
        {ai && <SectionCard id="ai-study-help" className="pm-pmp-public-study-card pm-pmp-public-ai-cards">
            <div className="pm-pmp-public-study-column">
                <h2>{ai.icon_image ? <img className="pm-pmp-public-icon-image" width="32" height="32" src={ai.icon_image} alt="" aria-hidden="true"/> : <Sparkles aria-hidden="true"/>}{ai.heading}</h2>
                <p className="pm-pmp-public-section-note">{ai.description}</p>
                <FeatureCards cards={ai.cards}/>
            </div>
        </SectionCard>}
    </>;
}

export function PmpPublicPlans({ content, destination }: { content: PmpPublicContent['plans']; destination: string }) {
    return <SectionCard id="simulator-plans" className="pm-pmp-public-plans">
        <h2>{content.icon_image ? <img className="pm-pmp-public-icon-image" src={content.icon_image} width="32" height="32" alt="" aria-hidden="true"/> : <Layers3 aria-hidden="true"/>}{content.heading}</h2>
        <p className="pm-pmp-public-section-note">{content.description}</p>
        <div className="pm-pmp-public-table-scroll" tabIndex={0} aria-label="Simulator plan comparison table; scroll horizontally on small screens">
            <table className="pm-pmp-public-plan-table">
                <thead><tr><th scope="col">{content.first_column}</th>{content.columns.map((column, index) =>
                    <th key={index} scope="col" className={index === 2 ? 'is-recommended' : ''}>{column.title}{column.subtitle && <small>{column.subtitle}</small>}</th>)}</tr></thead>
                <tbody>
                    {content.rows.map((row, ri) => <tr key={`${row.label}-${ri}`}>
                        <th scope="row">{row.label}</th>
                        {content.columns.map((_, ci) => <td key={ci} className={`${ci === 2 ? 'is-recommended' : ''}${ri === 0 ? ' is-price' : ''}`}>
                            {row.type === 'checkbox' ? (row.values[ci] === true ? <Check size={18} aria-label="Included"/> : <span aria-label="Not included">&mdash;</span>) : <span className="pm-pmp-plan-text">{String(row.values[ci] ?? '').split('\n').map((part, i) => i === 0 ? <span key={i}>{part}</span> : <small key={i}>{part}</small>)}</span>}
                        </td>)}
                    </tr>)}
                    <tr className="pm-pmp-public-plan-actions"><th scope="row">Get started</th>{content.columns.map((column, index) =>
                        <td key={index} className={index === 2 ? 'is-recommended' : ''}>
                            <Link href={destination} className={`pm-pmp-public-button ${index === 2 ? 'is-primary' : 'is-outline'} is-small`}>{column.action}</Link>
                        </td>)}</tr>
                </tbody>
            </table>
        </div>
        <p className="pm-pmp-public-price-note">{content.price_note}</p>
        <div className="pm-pmp-public-checkout-note"><ExternalLink size={18} aria-hidden="true"/><span>{content.checkout_note}</span></div>
    </SectionCard>;
}

export function PmpPublicFaq({ content }: { content: PmpPublicContent['faq'] }) {
    return <SectionCard className="pm-pmp-public-faq" id="simulator-faq">
        <h2>{content.heading}</h2>
        <div className="pm-pmp-public-faq-items">{content.items.map((item, index) => <details key={index}>
            <summary><ChevronDown aria-hidden="true"/>{item.question}</summary><p>{item.answer}</p>
        </details>)}</div>
    </SectionCard>;
}

export function PmpPublicVideoStories({ content }: { content: PmpPublicContent['video'] }) {
    const [videoError, setVideoError] = useState(false);
    useEffect(() => setVideoError(false), [content.video_url]);
    return <SectionCard className="pm-pmp-public-video" id="learner-video-stories">
        <h2>{content.heading}</h2>
        <div className="pm-pmp-public-video-grid">
            <div className="pm-pmp-public-video-frame">
                {videoError ? <div className="pm-pmp-public-video-error" role="status"><p>Video preview is unavailable right now.</p></div>
                    : <video key={content.video_url} aria-label="Illustrative learner video preview" controls playsInline preload="none" width="913" height="389" onError={() => setVideoError(true)}>
                        <source src={content.video_url} type="video/mp4"/>Your browser does not support HTML5 video.
                    </video>}
            </div>
            <div className="pm-pmp-public-video-points"><h3>{content.feedback_heading}</h3>{content.points.map((item, index) =>
                <div key={index}><PmpPublicIcon icon={item.icon} image={item.icon_image} size={36}/><span><strong>{item.title}</strong><p>{item.description}</p></span></div>)}</div>
        </div>
    </SectionCard>;
}

export function PmpPublicTestimonials({ content }: { content: PmpPublicContent['testimonials'] }) {
    const [index, setIndex] = useState(0);
    const items = content.items;
    const selected = items[index % items.length] ?? items[0];
    if (!selected) return null;
    return <SectionCard className="pm-pmp-public-testimonials" id="learner-testimonials">
        <h2>{content.heading}</h2>
        <div className="pm-pmp-public-testimonial-box" aria-label="Learner testimonials">
            {items.length > 1 && <button type="button" className="pm-pmp-public-carousel-button is-prev" aria-label="Previous testimonial" onClick={() => setIndex(i => (i + items.length - 1) % items.length)}><ChevronLeft aria-hidden="true"/></button>}
            <div className="pm-pmp-public-testimonial-content">
                {selected.image && <img src={selected.image} width="110" height="110" loading="lazy" decoding="async" alt="Learner portrait"/>}
                <h3>{selected.name}</h3><p>{selected.role}</p><blockquote>&ldquo;{selected.quote}&rdquo;</blockquote>
                {items.length > 1 && <div className="pm-pmp-public-carousel-dots" role="group" aria-label="Choose testimonial">{items.map((_, i) =>
                    <button key={i} aria-label={`Show testimonial ${i + 1}`} aria-current={i === index ? 'true' : undefined} className={i === index ? 'is-current' : undefined} type="button" onClick={() => setIndex(i)}/>)}</div>}
            </div>
            {items.length > 1 && <button type="button" className="pm-pmp-public-carousel-button is-next" aria-label="Next testimonial" onClick={() => setIndex(i => (i + 1) % items.length)}><ChevronRight aria-hidden="true"/></button>}
        </div>
    </SectionCard>;
}
