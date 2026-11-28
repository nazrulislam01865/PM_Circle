import { Head, router } from '@inertiajs/react';
import { needsProfileCompletionRefresh, rememberProfileCompletion } from '@/components/dashboard/profileCompletionSnapshot';
import { useEffect, useRef, useState } from 'react';
import { DashboardComposer } from '@/components/dashboard/DashboardComposer';
import { DashboardFeed } from '@/components/dashboard/DashboardFeed';
import type { PostCheckPreview } from '@/components/community/PostCheckCard';
import { MemberHomeOverview } from '@/components/dashboard/MemberHomeOverview';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardData, DashboardIdentity, DashboardFeedData, DashboardStatistics, DashboardFeedProps } from '@/types/dashboard';

export default function Dashboard({ dashboard, feed, postChecks, feedScopeCounts, statistics, planUsage, flashStatus }: {
    dashboard: DashboardIdentity & Partial<DashboardData>;
    feed?: DashboardFeedData;
    postChecks?: DashboardData['postChecks'];
    feedScopeCounts?: DashboardData['feedScopeCounts'];
    statistics?: DashboardStatistics | null;
    planUsage?: DashboardData['planUsage'] | null;
    flashStatus?: string | null;
}) {
    // The legacy full payload remains supported while the release switch is off.
    const feedData = { ...dashboard, ...feed, postChecks: postChecks ?? dashboard.postChecks!,
        feedScopeCounts: feedScopeCounts ?? dashboard.feedScopeCounts! } as DashboardFeedProps;
    const summary = statistics ?? (dashboard.learning && dashboard.overview ? { learning: dashboard.learning, overview: dashboard.overview } : undefined);
    const completionRefreshAttempted = useRef(false);
    const [submittingPost, setSubmittingPost] = useState<PostCheckPreview | null>(null);

    const { id: memberId, completion } = dashboard.member;
    useEffect(() => {
        if (completionRefreshAttempted.current || !needsProfileCompletionRefresh(memberId, completion)) return;
        completionRefreshAttempted.current = true;
        router.reload({
            only: ['dashboard'],
            onSuccess: page => {
                const identity = page.props.dashboard as DashboardIdentity | undefined;
                if (identity?.member.id === memberId) {
                    rememberProfileCompletion(memberId, identity.member.completion);
                }
            },
        });
    }, [memberId, completion]);

    return <MemberDashboardLayout dashboard={dashboard} variant="member-home"><Head title="Home" />
        <div className="pm-dash-columns"><div className="pm-dash-center">
            <h1 className="sr-only">Member dashboard</h1>
            {flashStatus && <p role="status" className="pm-dashboard-flash">{flashStatus}</p>}
            <DashboardComposer name={dashboard.member.name} plan={dashboard.isPreview ? 'free' : dashboard.plan} demo={dashboard.isDemo} onSubmissionStateChange={setSubmittingPost} blockedUntil={feedData.postChecks.blocked_until} />
            <DashboardFeed dashboard={feedData} progressive={Boolean(feed)} submittingPost={submittingPost} />
        </div><aside className="pm-dash-right" aria-label="Member overview">
            <MemberHomeOverview dashboard={dashboard} statistics={summary} planUsage={planUsage ?? dashboard.planUsage}/>
        </aside></div>
    </MemberDashboardLayout>;
}
