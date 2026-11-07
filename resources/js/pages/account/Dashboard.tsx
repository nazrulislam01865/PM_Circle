import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
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
    const overviewRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const overview = overviewRef.current;
        if (!overview) return;

        const updateStickyOffset = () => {
            // Allow a tall overview to move upward with the page before it sticks.
            // This keeps its lower cards reachable without creating another scroll area.
            const headerHeight = parseFloat(getComputedStyle(overview).getPropertyValue('--pm-member-header-height')) || 67;
            const offset = Math.min(headerHeight + 16, window.innerHeight - overview.getBoundingClientRect().height - 16);
            overview.style.setProperty('--pm-dash-right-sticky-top', `${Math.round(offset)}px`);
        };

        const observer = new ResizeObserver(updateStickyOffset);
        observer.observe(overview);
        window.addEventListener('resize', updateStickyOffset);
        updateStickyOffset();

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateStickyOffset);
        };
    }, []);

    return <MemberDashboardLayout dashboard={dashboard}><Head title="Dashboard" />
        <div className="pm-dash-columns"><div className="pm-dash-center">
            <div className="pm-dash-welcome"><h1>Good morning, {firstName}. <span className={`pm-dash-member-badge ${dashboard.plan === 'free' ? 'is-free' : ''}`}>{dashboard.plan !== 'free' && <Crown size={17} fill="currentColor"/>}{badge}</span></h1>
                <p>Keep learning, stay curious, and grow your project management skills.</p>
            </div>
            <DashboardComposer name={dashboard.member.name} plan={dashboard.isPreview ? 'free' : dashboard.plan} demo={dashboard.isDemo} />
            <DashboardPracticeCard dashboard={dashboard} />
            <DashboardFeed dashboard={dashboard} />
        </div><aside ref={overviewRef} className="pm-dash-right" aria-label="Member overview">
            <DashboardProfilePanel dashboard={dashboard}/>
            <DashboardLearningPanel dashboard={dashboard}/>
            <DashboardInsightsPanel dashboard={dashboard}/>
        </aside></div>
    </MemberDashboardLayout>;
}
