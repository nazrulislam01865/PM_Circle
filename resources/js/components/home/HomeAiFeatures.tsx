import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, UsersRound, type LucideIcon } from 'lucide-react';
import type { HomeAiFeaturesContent } from '@/types/home';

const icons: Record<string, LucideIcon> = {
    'clipboard-check': ClipboardCheck,
    'calendar-days': CalendarDays,
    'users-round': UsersRound,
    'book-open': BookOpen,
};

/** Copy and optional images come from the existing homepage content record. */
export function HomeAiFeatures({ content }: { content: HomeAiFeaturesContent }) {
    return <section className="pm-home-ai-section pm-home-wide-container" aria-labelledby="pm-home-ai-title">
        <div className="pm-home-ai-inner">
            <div className="pm-home-ai-heading">
                <h2 id="pm-home-ai-title">{content.heading}</h2>
                <Link href={content.button_url} className="pm-button pm-home-ai-cta">
                    {content.button_label} <ArrowRight aria-hidden="true"/>
                </Link>
            </div>
            <div className="pm-home-ai-grid">
                {content.cards.map((benefit, index) => {
                    const Icon = icons[benefit.icon] ?? BookOpen;
                    return <article className="pm-home-ai-card" key={`${benefit.icon}-${index}`}>
                        <img className="pm-home-ai-art" src={benefit.image || benefit.illustration} alt={benefit.alt}
                            width={400} height={349} loading="lazy" decoding="async"/>
                        <div className="pm-home-ai-card-content">
                            <div className="pm-home-ai-category"><Icon aria-hidden="true"/><span>{benefit.category}</span></div>
                            <h3>{benefit.title}</h3>
                            <p>{benefit.description}</p>
                        </div>
                    </article>;
                })}
            </div>
        </div>
    </section>;
}
