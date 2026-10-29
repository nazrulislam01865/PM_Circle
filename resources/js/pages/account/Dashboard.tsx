import { Head } from '@inertiajs/react';
import { Crown } from 'lucide-react';
import { DashboardComposer } from '@/components/dashboard/DashboardComposer';
import { DashboardFeed } from '@/components/dashboard/DashboardFeed';
import { DashboardInsightsPanel } from '@/components/dashboard/DashboardInsightsPanel';
import { DashboardLearningPanel } from '@/components/dashboard/DashboardLearningPanel';
import { DashboardPracticeCard } from '@/components/dashboard/DashboardPracticeCard';
import { DashboardProfilePanel } from '@/components/dashboard/DashboardProfilePanel';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardData } from '@/types/dashboard';

export default function Dashboard({ dashboard }: { dashboard: DashboardData }) {
    const firstName = dashboard.member.name.split(' ')[0];
    const badge = dashboard.plan === 'free' ? 'Free member' : dashboard.plan === 'premium' ? 'Premium member' : 'Pro member';
    return <MemberDashboardLayout dashboard={dashboard}><Head title="Dashboard" />
        <div className="pm-dash-columns"><div className="pm-dash-center">
            <div className="pm-dash-welcome"><h1>Good morning, {firstName}. <span className={`pm-dash-member-badge ${dashboard.plan === 'free' ? 'is-free' : ''}`}>{dashboard.plan !== 'free' && <Crown size={17} fill="currentColor"/>}{badge}</span></h1>
                <p>Keep learning, stay curious, and grow your project management skills.</p>
            </div>
            <DashboardComposer name={dashboard.member.name} plan={dashboard.plan} demo={dashboard.isDemo} />
            <DashboardPracticeCard dashboard={dashboard} />
            <DashboardFeed dashboard={dashboard} />
        </div><aside className="pm-dash-right" aria-label="Member overview">
            <DashboardProfilePanel dashboard={dashboard}/>
            <DashboardLearningPanel dashboard={dashboard}/>
            <DashboardInsightsPanel dashboard={dashboard}/>
        </aside></div>
    </MemberDashboardLayout>;
}
