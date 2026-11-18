import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, UsersRound, type LucideIcon } from 'lucide-react';

type AiBenefit = {
    category: string;
    title: string;
    description: string;
    illustration: string;
    illustrationDescription: string;
    icon: LucideIcon;
};

// Fixed marketing content from the approved homepage prototype; no backend requests.
const benefits: readonly AiBenefit[] = [
    {
        category: 'Exam Simulator',
        title: 'Ask AI about any question',
        description: 'After your mock, ask follow-up questions in Question Review.',
        illustration: '/images/home/ai-features/exam-question-review.webp',
        illustrationDescription: 'Question Review with an AI explanation of the correct option',
        icon: ClipboardCheck,
    },
    {
        category: 'Daily Challenge',
        title: 'A new AI challenge every day',
        description: 'Get AI feedback on your response and improve your reasoning.',
        illustration: '/images/home/ai-features/daily-challenge-feedback.webp',
        illustrationDescription: 'Daily challenge followed by a card showing AI feedback',
        icon: CalendarDays,
    },
    {
        category: 'Community Feed',
        title: 'AI helps keep the feed safe',
        description: 'AI checks every post. Admins make the final call.',
        illustration: '/images/home/ai-features/community-admin-review.webp',
        illustrationDescription: 'AI-assisted community moderation with administrator review',
        icon: UsersRound,
    },
    {
        category: 'Learn & Practice',
        title: 'Learn with AI support',
        description: 'Get AI guidance as you learn and practise.',
        illustration: '/images/home/ai-features/learn-with-ai.webp',
        illustrationDescription: 'Learning and practice materials with an AI assistant',
        icon: BookOpen,
    },
];

function AiBenefitCard({ benefit }: { benefit: AiBenefit }) {
    const Icon = benefit.icon;

    return <article className="pm-home-ai-card">
        <img
            className="pm-home-ai-art"
            src={benefit.illustration}
            alt={benefit.illustrationDescription}
            width={400}
            height={349}
            loading="lazy"
            decoding="async"
        />
        <div className="pm-home-ai-card-content">
            <div className="pm-home-ai-category"><Icon aria-hidden="true"/><span>{benefit.category}</span></div>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
        </div>
    </article>;
}

/** Promotional homepage section, intentionally independent from AI usage or subscription queries. */
export function HomeAiFeatures() {
    return <section className="pm-home-ai-section pm-home-wide-container" aria-labelledby="pm-home-ai-title">
        <div className="pm-home-ai-inner">
            <div className="pm-home-ai-heading">
                <h2 id="pm-home-ai-title">How AI helps you on PM Circle</h2>
                <Link href="/pricing" className="pm-button pm-home-ai-cta">
                    Explore Plus plans <ArrowRight aria-hidden="true"/>
                </Link>
            </div>
            <div className="pm-home-ai-grid">
                {benefits.map(benefit => <AiBenefitCard key={benefit.category} benefit={benefit}/>)}
            </div>
        </div>
    </section>;
}
