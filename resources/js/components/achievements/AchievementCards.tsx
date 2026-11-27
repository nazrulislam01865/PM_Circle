import { Link } from '@inertiajs/react';
import { ArrowRight, Check, LockKeyhole, Sparkle } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { medalPaths } from './artwork';
import type { AchievementBadge, AchievementPath } from './types';

export const badgeStatusLabel = { earned: 'Earned', progress: 'In progress', locked: 'Locked' } as const;
export const achievementHref = '/dashboard/features/achievements';

export function achievementDate(value: string) {
    return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(new Date(value.length === 10 ? `${value}T12:00:00+06:00` : value));
}
export function badgeRequirement(badge: AchievementBadge) {
    if (badge.mode === 'completion') return `${badge.target} of ${badge.targetLabels?.length ?? badge.target} selected activities completed${badge.targetLabels?.length ? `: ${badge.targetLabels.join(', ')}` : ''}.`;
    return badge.metric === 'profile' ? `Reach ${badge.target}% profile completion.` : `${badge.target} ${badge.unit}.`;
}
export function badgeProgressText(badge: AchievementBadge) {
    if (badge.status === 'earned') return badge.earnedAt ? `Earned ${achievementDate(badge.earnedAt)}` : 'Earned';
    const remaining = Math.max(0, badge.target - badge.value);
    return `${Math.min(badge.value, badge.target)} / ${badge.target} · ${remaining}${badge.metric === 'profile' ? ' percentage points' : ' more'} to unlock`;
}
export function BadgeMedal({ badge }: { badge: AchievementBadge }) {
    const art = badge.art ?? badge.metric;
    if (badge.artworkUrl) return <span className={`pm-ach-medal is-${badge.status}`} aria-hidden="true"><img className="pm-ach-custom-art" src={badge.artworkUrl} alt=""/></span>;
    const palette = ['light', 'dark', 'edge'].reduce((style, key) => ({ ...style, [`--medal-${key}`]: `var(--achievement-${art}-${key})` }), {}) as CSSProperties;
    return <span className={`pm-ach-medal tier-${badge.tier} is-${badge.status}`} style={palette} aria-hidden="true">
        <span className="pm-ach-medal-face"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d={medalPaths[art] ?? medalPaths.courses}/></svg></span>
        <span className="pm-ach-medal-tier">{['I', 'II', 'III'][badge.tier - 1]}</span>
    </span>;
}
export function AchievementProgress({ value, max, label, earned = false }: { value: number; max: number; label: string; earned?: boolean }) {
    return <progress className={`pm-ach-progress${earned ? ' is-earned' : ''}`} max={Math.max(1, max)} value={Math.max(0, Math.min(value, max))} aria-label={label}/>;
}
export function AchievementPanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
    return <section className="pm-ach-panel"><div className="pm-ach-between"><h2>{title}</h2>{action}</div>{description && <p className="pm-ach-meta">{description}</p>}{children}</section>;
}
export function BadgeCard({ badge, onDetails }: { badge: AchievementBadge; onDetails: (badge: AchievementBadge) => void }) {
    return <article className={`pm-ach-card is-${badge.status}`}>
        <div className="pm-ach-between pm-ach-card-top"><BadgeMedal badge={badge}/><span className="pm-ach-tags">
            {badge.newBadge && <span className="pm-ach-tag is-new">New</span>}
            <span className={`pm-ach-tag is-${badge.status}`}>{badge.status === 'earned' ? <Check aria-hidden="true"/> : badge.status === 'locked' ? <LockKeyhole aria-hidden="true"/> : null}{badgeStatusLabel[badge.status]}</span>
        </span></div>
        <p className="pm-ach-meta">{badge.category} · Step {badge.tier}</p><h3>{badge.name}</h3><p className="pm-ach-meta">{badgeRequirement(badge)}</p>
        <AchievementProgress value={badge.value} max={badge.target} label={`${badge.name} progress`} earned={badge.status === 'earned'}/>
        <p className="pm-ach-progress-copy">{badgeProgressText(badge)}</p>
        <button type="button" className="pm-button pm-button-sm pm-button-outline" onClick={() => onDetails(badge)}>Badge details</button>
    </article>;
}
export function BadgeGrid({ badges, onDetails, empty }: { badges: AchievementBadge[]; onDetails: (badge: AchievementBadge) => void; empty: string }) {
    return badges.length ? <div className="pm-ach-badge-grid">{badges.map(badge => <BadgeCard key={badge.id} badge={badge} onDetails={onDetails}/>)}</div> : <p className="pm-ach-empty">{empty}</p>;
}
export function LatestBadgeCards({ badges, action, variant = 'panel' }: { badges: AchievementBadge[]; action?: ReactNode; variant?: 'panel' | 'profile-rail' }) {
    if (variant === 'profile-rail') {
        const latest = badges.filter(badge => badge.status === 'earned').slice(0, 3);
        return <section className="pm-card pm-profile-latest-badges" aria-labelledby="profile-latest-badges-title">
            <div className="pm-card-body">
                <h3 id="profile-latest-badges-title" className="pm-card-title"><Sparkle aria-hidden="true"/> Latest badges</h3>
                {latest.length ? <ul className="pm-profile-latest-badges-grid">{latest.map(badge => <li key={badge.id} className="pm-profile-latest-badge">
                    <BadgeMedal badge={badge}/>
                    <strong>{badge.name}</strong>
                    {badge.earnedAt && <time dateTime={badge.earnedAt}>{achievementDate(badge.earnedAt)}</time>}
                </li>)}</ul> : <p className="pm-ach-empty">No activity badges earned yet.</p>}
                <Link href={achievementHref} className="pm-button pm-button-outline pm-profile-latest-badges-action">View all achievements <ArrowRight aria-hidden="true"/></Link>
            </div>
        </section>;
    }
    return <AchievementPanel title="Latest badges" description="The three most recent earned badges on the member profile." action={action ?? <Link href={achievementHref} className="pm-button pm-button-sm pm-button-outline">View achievements</Link>}>
        {badges.length ? <div className="pm-ach-badge-grid">{badges.map(badge => <article className="pm-ach-card pm-ach-profile-card" key={badge.id}><BadgeMedal badge={badge}/><h3>{badge.name}</h3><p className="pm-ach-meta">{badgeProgressText(badge)}</p></article>)}</div> : <p className="pm-ach-empty">No activity badges earned yet.</p>}
    </AchievementPanel>;
}
export function LearningPathways({ paths, onRecord }: { paths: AchievementPath[]; onRecord: () => void }) {
    const completed = paths.reduce((sum, path) => sum + path.completedActivities, 0);
    return <AchievementPanel title="Learning pathways" description={`${completed} pathway activities completed.`} action={<button className="pm-button pm-button-sm pm-button-outline" type="button" onClick={onRecord}>View record</button>}>
        {paths.length ? <div className="pm-ach-path-grid">{paths.map((path, index) => <article className="pm-ach-path" key={path.id}>
            <span className="pm-ach-meta">Pathway {index + 1}</span><h3>{path.slug ? <Link href={`/learning/${encodeURIComponent(path.slug)}`}>{path.title}</Link> : path.title}</h3>
            <p className="pm-ach-progress-copy">{path.completedActivities} / {path.totalActivities} activities</p>
            <AchievementProgress value={path.completedActivities} max={path.totalActivities} label={path.title}/>
        </article>)}</div> : <p className="pm-ach-empty">No published learning pathways yet.</p>}
    </AchievementPanel>;
}
