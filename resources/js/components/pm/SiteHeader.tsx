import { useState, type ReactNode } from 'react';
import { MemberHomeHeader } from '@/components/dashboard/MemberHomeHeader';
import { MemberCompactHeader } from '@/components/dashboard/MemberCompactHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { usePage } from '@inertiajs/react';
import type { DashboardShellData } from '@/types/dashboard';
import { NotificationCenterProvider } from '@/components/notifications/NotificationCenter';
import { HomeOfferBar } from '@/components/home/v2/HomeHero';
import { RewardOfferProvider } from '@/components/rewards/RewardOfferDialog';

type HeaderProps = {
    active?: string;
    /** Guest registration call-to-action label. */
    joinLabel?: string;
    actions?: ReactNode;
    brandPlacement?: 'always' | 'mobile';
    brandHref?: string;
    authenticatedMemberNavigation?: boolean;
    /** Keep promotional content out of the active exam workspace. */
    showOffer?: boolean;
};

/** Both guests and signed-in members render the same shared navigation component. */
export function SiteHeader({ active, actions, brandHref, joinLabel, authenticatedMemberNavigation = false, showOffer = true }: HeaderProps) {
    const [navigationOpen, setNavigationOpen] = useState(false);
    const { auth, memberShell, rewardPromotion } = usePage<{ auth?: { user?: { is_admin?: boolean } | null }; memberShell?: DashboardShellData | null; rewardPromotion?: { discountLabel: string } | null }>().props;
    if (authenticatedMemberNavigation && memberShell && auth?.user && !auth.user.is_admin) {
        const label = showOffer ? rewardPromotion?.discountLabel : undefined;
        const header = <div className="pm-member-exam-navigation pm-member-exam-compact">
            {label && <HomeOfferBar discountLabel={label}/>}
            <DashboardSidebar dashboard={memberShell} open={navigationOpen} close={() => setNavigationOpen(false)} collapsed={false} onToggle={() => setNavigationOpen(value => !value)}/>
            <MemberCompactHeader dashboard={memberShell} onOpenNavigation={() => setNavigationOpen(true)}/>
        </div>;
        return <NotificationCenterProvider>{label ? <RewardOfferProvider discountLabel={label} isMember>{header}</RewardOfferProvider> : header}</NotificationCenterProvider>;
    }
    return <NotificationCenterProvider><MemberHomeHeader active={active} actions={actions} brandHref={brandHref} joinLabel={joinLabel} /></NotificationCenterProvider>;
}
