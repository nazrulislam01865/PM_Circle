import type { ReactNode } from 'react';
import { usePublicPageBanner } from '@/components/pm/PublicPageBanner';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export type DiscoverStage = 'intro' | 'about' | 'explore' | 'findings' | 'practice' | 'next'
    | 'career' | 'sample' | 'review' | 'platform' | 'decision';

const reflectionSteps = ['About you', 'Explore', 'Findings', 'Your next step'];

export function DiscoverCard({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: ReactNode }) {
    const StageHeading = usePublicPageBanner() ? 'h2' : 'h1';
    return <section className="pm-discover-card" aria-labelledby="pm-discover-title">
        <p className="pm-discover-eyebrow">{eyebrow}</p>
        <StageHeading id="pm-discover-title">{title}</StageHeading>
        {description && <p className="pm-discover-description">{description}</p>}
        {children}
    </section>;
}

export function DiscoverShell({ stage, questionIndex, careerIndex = 0, children }: {
    stage: DiscoverStage;
    questionIndex: number;
    careerIndex?: number;
    children: ReactNode;
}) {
    const isCareer = ['career', 'sample', 'review', 'platform', 'decision'].includes(stage);
    const active = stage === 'intro' || stage === 'about' ? 0 : stage === 'explore' ? 1 : stage === 'findings' || stage === 'practice' ? 2 : 3;
    const percentage = isCareer ? (stage === 'career' ? 61 + (careerIndex + 1) * 3 : stage === 'sample' ? 91 : stage === 'review' ? 94 : stage === 'platform' ? 97 : 100)
        : stage === 'intro' ? 0 : stage === 'about' ? 5 : stage === 'explore' ? 11 + questionIndex * 7 : stage === 'practice' ? 45 : stage === 'findings' ? 54 : 60;

    return <PublicLayout siteLayout guideLayout banner={{title: 'Discover PM', description: 'Explore your career direction.'}}>
        <div className="pm-discover pm-discover-page">
            <div className="pm-discover-main">
                <nav className="pm-discover-steps" aria-label="Discover PM progress">
                    {reflectionSteps.map((name, index) => <span key={name} className={`pm-discover-step${index === active ? ' is-current' : ''}`} aria-current={index === active ? 'step' : undefined}>
                        <span className="pm-discover-step-number">{index + 1}</span>{name}
                    </span>)}
                </nav>
                <div className="pm-discover-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} aria-label="Journey progress">
                    <span style={{ width: `${percentage}%` }}/>
                </div>
                {children}
            </div>
        </div>
    </PublicLayout>;
}

export function DiscoverActions({ onBack, onNext, nextLabel, disabled = false }: {
    onBack: () => void;
    onNext: () => void;
    nextLabel: string;
    disabled?: boolean;
}) {
    return <div className="pm-discover-actions">
        <button type="button" className="btn secondary pm-discover-action" onClick={onBack}>← Back</button>
        <button type="button" className="btn pm-discover-action" onClick={onNext} disabled={disabled}>{nextLabel} →</button>
    </div>;
}
