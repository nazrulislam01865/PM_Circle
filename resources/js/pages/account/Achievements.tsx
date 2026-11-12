import { Link } from '@inertiajs/react';
import { BookOpen, Flag, MessageCircle, Star, Trophy } from 'lucide-react';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';

type Milestone = { key: 'first-post' | 'first-reply' | 'first-scenario'; label: string };
const badgeIcons = { 'first-post': Star, 'first-reply': MessageCircle, 'first-scenario': Flag } as const;

export default function Achievements({ completedActivities, paths, badges }: {
    completedActivities: number;
    paths: { id: number; title: string; slug: string; completedActivities: number }[];
    badges: Milestone[];
}) {
    return <ContentPage title="Achievements & learning record" subtitle="Track your learning progress and earned community activity milestones.">
        <section className="pm-panel pm-feature-section"><h2><Trophy size={22} className="inline-block" /> Your learning progress</h2><p>{completedActivities} practice activities completed.</p>
            {paths.length ? <div className="pm-feature-progress-grid">{paths.map(path => <Link href={`/learning/${path.slug}`} className="pm-feature-progress-card" key={path.id}><BookOpen size={20}/><strong>{path.title}</strong><small>{path.completedActivities} activities completed</small></Link>)}</div> : <FeatureEmpty title="No learning paths yet" description="Once learning paths are published, your progress will appear here." href="/dashboard/learning" linkLabel="Explore learning" />}
        </section>
        <section className="pm-panel pm-feature-section"><h2>Earned badges</h2>
            {badges.length ? <div className="pm-member-overview-badges">{badges.map(badge => { const Icon = badgeIcons[badge.key]; return <div key={badge.key} className="pm-member-overview-badge"><span className={`pm-member-overview-badge-icon is-${badge.key}`}><Icon size={22} aria-hidden="true" /></span><span>{badge.label}</span></div>; })}</div> : <FeatureEmpty title="No activity badges earned yet" description="Publish a post, reply to a discussion or participate in a scenario to earn your first activity milestone." href="/community" linkLabel="Visit community" />}
        </section>
        <p className="pm-feature-privacy">Activity badges reflect recorded PM Circle participation, not official PMP or Scrum certifications.</p>
    </ContentPage>;
}
