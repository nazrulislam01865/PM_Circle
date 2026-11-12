import { Link } from '@inertiajs/react';
import { ArrowRight, Crown, Eye, Flag, LockKeyhole, MessageCircle, Star } from 'lucide-react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardData } from '@/types/dashboard';

const badgeIcons = { 'first-post': Star, 'first-reply': MessageCircle, 'first-scenario': Flag } as const;

/** One compact, data-backed sidebar for the logged-in homepage. */
export function MemberHomeOverview({ dashboard }: { dashboard: DashboardData }) {
    const { member, learning, overview } = dashboard;
    const memberType = dashboard.plan === 'premium' ? 'Plus member' : dashboard.plan === 'pro' ? 'Pro member' : 'Free member';

    return <>
        <section className="pm-dash-card pm-member-overview-card pm-member-home-profile">
            <h2>My profile</h2>
            <div className="pm-member-home-identity">
                <DashboardAvatar name={member.name} size={48} src={member.avatar_path} />
                <div><strong>{member.name}</strong><span>{dashboard.plan !== 'free' && <Crown size={15} fill="currentColor" aria-hidden="true" />}{memberType}</span></div>
            </div>
            <div className="pm-member-overview-completion-label"><span>Profile completion</span><strong>{member.completion}%</strong></div>
            <div className="pm-member-overview-progress" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.completion}><span style={{ width: `${Math.min(100, Math.max(0, member.completion))}%` }} /></div>
            <div className="pm-member-overview-profile-links">
                <Link href="/dashboard/features/public-profile"><Eye size={17} aria-hidden="true" />View public profile</Link>
                <Link href="/settings/profile?tab=privacy"><LockKeyhole size={16} aria-hidden="true" />Manage privacy</Link>
            </div>
        </section>

        <section className="pm-dash-card pm-member-overview-card pm-member-home-badges">
            <div className="pm-member-overview-heading"><h2>Earned badges</h2><Link href="/dashboard/features/achievements" className="pm-member-overview-heading-link">View all <ArrowRight size={17} aria-hidden="true" /></Link></div>
            {overview.badges.length > 0 ? <div className="pm-member-overview-badges">
                {overview.badges.map(badge => { const Icon = badgeIcons[badge.key]; return <div className="pm-member-overview-badge" key={badge.key}><span className={`pm-member-overview-badge-icon is-${badge.key}`}><Icon size={22} aria-hidden="true" /></span><span>{badge.label}</span></div>; })}
            </div> : <p className="pm-member-overview-empty">No activity badges earned yet.</p>}
        </section>

        <section className="pm-dash-card pm-member-overview-card pm-member-home-insights">
            <h2>Profile insights</h2>
            <div className="pm-member-overview-metrics is-two">
                <div><strong>{overview.insights.last30}</strong><span>Views in 30 days</span></div>
                <div><strong>{overview.insights.thisWeek}</strong><span>Views this week</span></div>
            </div>
            <Link href="/dashboard/features/insights" className="pm-member-overview-link">View insights <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <section className="pm-dash-card pm-member-overview-card pm-member-home-learning">
            <h2>Your learning</h2>
            <div className="pm-member-overview-rows">
                <div><span>Learning time</span><strong>{learning.time}</strong></div>
                <div><span>Scenarios completed</span><strong>{learning.scenarios}</strong></div>
                <div><span>Learning level</span><strong>Level {learning.level}</strong></div>
            </div>
            <Link href="/dashboard/learning" className="pm-member-overview-link">Continue learning <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <section className="pm-dash-card pm-member-overview-card pm-member-home-syllabus">
            <h2>Exam syllabus</h2>
            <div className="pm-member-overview-rows"><div><span>{overview.syllabus.name}</span><strong>{overview.syllabus.status}</strong></div></div>
            <Link href="/exams/pmp" className="pm-member-overview-link">View syllabus <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>

        <section className="pm-dash-card pm-member-overview-card pm-member-home-contribution">
            <h2>Community contribution</h2>
            <div className="pm-member-overview-metrics is-three">
                <div><strong>{overview.contribution.posts}</strong><span>Posts</span></div>
                <div><strong>{overview.contribution.replies}</strong><span>Replies</span></div>
                <div><strong>{overview.contribution.responses}</strong><span>Responses</span></div>
            </div>
            <Link href="/dashboard/features/insights" className="pm-member-overview-link">View activity <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
    </>;
}
