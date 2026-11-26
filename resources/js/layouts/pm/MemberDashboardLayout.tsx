import { usePage } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { MemberCompactHeader } from '@/components/dashboard/MemberCompactHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { readSidebarPreference, writeSidebarPreference } from '@/components/dashboard/sidebarPreference';
import { HomeOfferBar } from '@/components/home/v2/HomeHero';
import { RewardOfferProvider } from '@/components/rewards/RewardOfferDialog';
import type { DashboardShellData } from '@/types/dashboard';
import { SiteFooter } from '@/components/pm/SiteFooter';
import { MemberBreadcrumb } from '@/components/dashboard/MemberBreadcrumb';
import { memberBreadcrumbs, type BreadcrumbFallback } from '@/components/dashboard/memberBreadcrumbs';
import { NotificationCenterProvider } from '@/components/notifications/NotificationCenter';

/** Single authenticated shell: one header, one sidebar, one footer on every member route. */
export function MemberDashboardLayout({ dashboard, children, variant = 'dashboard', fullWidth = false, breadcrumbFallback }: {
    dashboard: DashboardShellData;
    children: ReactNode;
    variant?: 'dashboard' | 'learning' | 'learning-catalog' | 'member-home';
    fullWidth?: boolean;
    breadcrumbFallback?: BreadcrumbFallback;
}) {
    const page = usePage<{ rewardPromotion?: { discountLabel: string } | null }>();
    const { rewardPromotion } = page.props;
    const breadcrumbs = memberBreadcrumbs(page.url, page.props, breadcrumbFallback);
    const [navigationOpen, setNavigationOpen] = useState(false);
    const [navigationCollapsed, setNavigationCollapsed] = useState(readSidebarPreference);
    const toggleSidebar = () => {
        const next = !navigationCollapsed;
        writeSidebarPreference(next);
        setNavigationCollapsed(next);
    };
    const discountLabel = rewardPromotion?.discountLabel;
    const shell = <div className={`pm-app pm-dashboard pm-member-shell pm-member-sidebar-layout${discountLabel ? ' has-member-offer' : ''}${fullWidth ? ' pm-member-full-width' : ''}${variant === 'member-home' ? ' pm-member-home' : ''}${variant === 'learning' || variant === 'learning-catalog' ? ' pm-learning-view' : ''}${variant === 'learning-catalog' ? ' pm-learning-catalog-view' : ''}${navigationCollapsed ? ' is-sidebar-collapsed' : ''}`}>
        {discountLabel && <HomeOfferBar discountLabel={discountLabel}/>}
        <div className="pm-member-content-frame">
            <DashboardSidebar dashboard={dashboard} open={navigationOpen} close={() => setNavigationOpen(false)} collapsed={navigationCollapsed} onToggle={toggleSidebar}/>
            <MemberCompactHeader dashboard={dashboard} onOpenNavigation={() => setNavigationOpen(true)} onExpandNavigation={navigationCollapsed ? toggleSidebar : undefined}/>
            <div className="pm-dashboard-layout">
                <div className="pm-dash-workspace">
                    <main id="main-content" className="pm-dash-body" data-member-breadcrumb={breadcrumbs.length ? "shared" : undefined}><MemberBreadcrumb items={breadcrumbs}/>{children}</main>
                </div>
            </div>
            <SiteFooter member/>
        </div>
    </div>;
    return <NotificationCenterProvider>{discountLabel ? <RewardOfferProvider discountLabel={discountLabel} isMember>{shell}</RewardOfferProvider> : shell}</NotificationCenterProvider>;
}
