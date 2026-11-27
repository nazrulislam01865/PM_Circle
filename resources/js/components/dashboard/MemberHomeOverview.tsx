import type { ReactNode } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowRight, Check, ClipboardList, Crown, Eye, LockKeyhole, Wallet } from 'lucide-react';
import { ProfileCompletionReward } from '@/components/rewards/ProfileCompletionReward';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardData, DashboardIdentity, DashboardStatistics } from '@/types/dashboard';

import { BadgeMedal } from '@/components/achievements/AchievementCards';

/** Compact summary cards share the member overview typography, border and link styles. */
function OverviewSummaryCard({ title, icon, status, children, href, action }: {
    title: string; icon: ReactNode; status?: ReactNode; children: ReactNode; href: string; action: string;
}) {
    return <section className="pm-dash-card pm-member-overview-card pm-member-overview-summary">
        <div className="pm-member-overview-summary-heading">
            <h2><span className="pm-member-overview-summary-icon">{icon}</span>{title}</h2>
            {status}
        </div>
        {children}
        <Link href={href} className="pm-member-overview-link">{action} <ArrowRight size={17} aria-hidden="true" /></Link>
    </section>;
}

/** One compact, data-backed sidebar for the logged-in homepage. */
export function MemberHomeOverview({ dashboard, statistics, planUsage }: { dashboard: DashboardIdentity;
    statistics?: DashboardStatistics; planUsage?: DashboardData['planUsage'] }) {
    const { member } = dashboard;
    const { learning, overview } = statistics ?? {};
    const planLabel = planUsage ? { free: 'Free plan', plus: 'Plus plan', pro: 'Pro plan' }[planUsage.plan] : '';
    const memberType = dashboard.plan === 'premium' ? 'Plus member' : dashboard.plan === 'pro' ? 'Pro member' : 'Free member';

    return <>
        <section className="pm-dash-card pm-member-overview-card pm-member-home-profile">
            <h2>My profile</h2>
            <div className="pm-member-home-identity">
                <DashboardAvatar name={member.name} size={48} src={member.avatar_path} />
                <div><strong>{member.name}</strong><span>{dashboard.plan !== 'free' && <Crown size={15} fill="currentColor" aria-hidden="true" />}{memberType}</span></div>
            </div>
            <div className="pm-member-overview-completion-label"><span>Profile completion</span><strong>{member.completion}%{member.completion === 100 && <Check size={13} aria-label="Complete" />}</strong></div>
            <div className="pm-member-overview-progress" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.completion}><span style={{ width: `${Math.min(100, Math.max(0, member.completion))}%` }} /></div>
            <div className="pm-member-overview-profile-links">
                <Link href="/settings/profile"><Eye size={17} aria-hidden="true" />View profile</Link>
                <Link href="/settings/profile?tab=privacy"><LockKeyhole size={16} aria-hidden="true" />Manage privacy</Link>
            </div>
        </section>

        <ProfileCompletionReward reward={dashboard.reward} />

        {overview ? <section className="pm-dash-card pm-member-overview-card pm-member-home-badges">
            <div className="pm-member-overview-heading"><h2>Earned badges</h2><Link href="/dashboard/features/achievements" className="pm-member-overview-heading-link">View all <ArrowRight size={17} aria-hidden="true" /></Link></div>
            {overview.badges.length > 0 ? <div className="pm-member-overview-badges">
                {overview.badges.map(badge => <div className="pm-member-overview-badge pm-ach-home-badge" key={badge.id}><BadgeMedal badge={badge}/><span>{badge.name}</span></div>)}
            </div> : <p className="pm-member-overview-empty">No activity badges earned yet.</p>}
        </section>

        : <SummaryPending title="Earned badges" prop="statistics" />}

        {planUsage ? <><OverviewSummaryCard title="Plan & usage" icon={<Wallet aria-hidden="true" />}
            status={<span className="pm-member-overview-summary-pill">{planLabel}</span>}
            href="/membership" action="View usage">
            <p className="pm-member-overview-summary-copy">{planUsage.tokensRemaining !== null
                ? `${planUsage.tokensRemaining.toLocaleString('en-US')} AI tokens remaining`
                : planUsage.examAccess ? 'No active PMP AI token allowance' : 'PMP AI tokens not included'}</p>
        </OverviewSummaryCard>

        <OverviewSummaryCard title="Practice & results" icon={<ClipboardList aria-hidden="true" />}
            href="/exams/pmp/enter" action="View simulator access">
            <div className="pm-member-overview-summary-row">
                <span className="pm-member-overview-summary-copy">PMP Exam Simulator</span>
                <span className="pm-member-overview-summary-pill">
                    {planUsage.examAccess ? <Check aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
                    {planUsage.examAccess ? 'Included' : 'Premium access'}
                </span>
            </div>
        </OverviewSummaryCard>

        </> : <><SummaryPending title="Plan & usage" prop="planUsage"/><SummaryPending title="Practice & results" prop="planUsage"/></>}

        {overview && learning ? <><section className="pm-dash-card pm-member-overview-card pm-member-home-insights">
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
            <Link href="/activity-log" className="pm-member-overview-link">View activity <ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
        </> : <>{['Profile insights', 'Your learning', 'Exam syllabus', 'Community contribution'].map(title => <SummaryPending key={title} title={title} prop="statistics"/>)}</>}
    </>;
}

function SummaryPending({ title, prop }: { title: string; prop: 'statistics' | 'planUsage' }) {
    return <section className="pm-dash-card pm-member-overview-card" aria-label={title} style={{ minHeight: 104 }}>
        <h2>{title}</h2><p className="pm-member-overview-empty">Summary not loaded yet.</p>
        <button type="button" className="pm-member-overview-link" onClick={() => router.reload({ only: [prop] })}>Retry summary</button>
    </section>;
}
