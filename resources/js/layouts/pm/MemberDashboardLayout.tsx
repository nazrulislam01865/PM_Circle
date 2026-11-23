import { usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { MemberCompactHeader } from '@/components/dashboard/MemberCompactHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { HomeOfferBar } from '@/components/home/v2/HomeHero';
import { RewardOfferProvider } from '@/components/rewards/RewardOfferDialog';
import type { DashboardShellData } from '@/types/dashboard';
import { SiteFooter } from '@/components/pm/SiteFooter';
import { NotificationCenterProvider } from '@/components/notifications/NotificationCenter';

/** Single authenticated shell: one header, one sidebar, one footer on every member route. */
export function MemberDashboardLayout({ dashboard, children, variant = 'dashboard', fullWidth = false }: {
    dashboard: DashboardShellData;
    children: ReactNode;
    variant?: 'dashboard' | 'learning' | 'learning-catalog' | 'member-home';
    fullWidth?: boolean;
}) {
    const { rewardPromotion } = usePage<{ rewardPromotion?: { discountLabel: string } | null }>().props;
    const [navigationOpen, setNavigationOpen] = useState(false);
    const [navigationCollapsed, setNavigationCollapsed] = useState(false);
    const discountLabel = rewardPromotion?.discountLabel;
    const shell = <div className={`pm-app pm-dashboard pm-member-shell pm-member-sidebar-layout${discountLabel ? ' has-member-offer' : ''}${fullWidth ? ' pm-member-full-width' : ''}${variant === 'member-home' ? ' pm-member-home' : ''}${variant === 'learning' || variant === 'learning-catalog' ? ' pm-learning-view' : ''}${variant === 'learning-catalog' ? ' pm-learning-catalog-view' : ''}${navigationCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        {discountLabel && <HomeOfferBar discountLabel={discountLabel}/>}
        <div className="pm-member-content-frame">
            <DashboardSidebar dashboard={dashboard} open={navigationOpen} close={() => setNavigationOpen(false)} collapsed={navigationCollapsed} onToggle={() => setNavigationCollapsed(value => !value)}/>
            <MemberCompactHeader dashboard={dashboard} onOpenNavigation={() => setNavigationOpen(true)}/>
            <div className="pm-dashboard-layout">
                <div className="pm-dash-workspace">
                    <main id="main-content" className="pm-dash-body">{children}</main>
                </div>
            </div>
        </div>
        <SiteFooter />
    </div>;
    return <NotificationCenterProvider>{discountLabel ? <RewardOfferProvider discountLabel={discountLabel} isMember>{shell}</RewardOfferProvider> : shell}</NotificationCenterProvider>;
}
