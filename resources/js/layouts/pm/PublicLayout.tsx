import { PublicPageBanner, PublicPageBannerContext, type PublicPageBannerData } from '@/components/pm/PublicPageBanner';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/pm/SiteFooter';
import { HomeOfferBar } from '@/components/home/v2/HomeHero';
import { RewardOfferProvider } from '@/components/rewards/RewardOfferDialog';
import { HomeHeader } from '@/components/home/v2/HomeHeader';
import { SiteHeader } from '@/components/pm/SiteHeader';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';
import type { PmpPublicContent } from '@/types/pmp-public';

type AuthProps = { auth: { user: { name: string; onboarding_step: number; is_admin?: boolean } | null }; memberShell: DashboardShellData | null; rewardPromotion?: { discountLabel: string } | null };
export function PublicLayout({ children, active, joinLabel = 'Join the community', pricingPrototype = false, memberVariant, siteLayout = false, footerVariant, pmpFooterContent, hideFooter = false, homeOfferLabel, homePrototype = false, guideLayout = false, eventPrototype = false, homeEventsVisible = true, homeAiVisible = true, banner }: { children: ReactNode; active?: string; joinLabel?: string; pricingPrototype?: boolean; memberVariant?: 'learning-catalog'; siteLayout?: boolean; footerVariant?: 'pmp' | 'contact'; pmpFooterContent?: PmpPublicContent['footer']; hideFooter?: boolean; homeOfferLabel?: string; homePrototype?: boolean; guideLayout?: boolean; eventPrototype?: boolean; homeEventsVisible?: boolean; homeAiVisible?: boolean; banner?: PublicPageBannerData }) {
    const { auth, memberShell, rewardPromotion } = usePage<AuthProps>().props;
    const discountLabel = homeOfferLabel ?? rewardPromotion?.discountLabel;
    // Authenticated member workspaces retain their existing navigation and permissions.
    // Every guest page renders the exact public homepage header, regardless of its route.
    if (auth?.user && !auth.user.is_admin && memberShell && auth.user.onboarding_step >= 3) {
        return <MemberDashboardLayout dashboard={memberShell} variant={memberVariant} fullWidth={siteLayout || homePrototype || guideLayout || eventPrototype}>
            <div className={`pm-member-public-content${guideLayout ? ' pm-guide-public-shell' : ''}`}>{children}</div>
        </MemberDashboardLayout>;
    }
    const isGuest = !auth?.user;
    const showHomeHeader = homePrototype || isGuest;
    const pageShell = <div className={`pm-app pm-page-shell${pricingPrototype ? ' pm-pricing-shell' : ''}${showHomeHeader ? ' pm-home-v2-shell' : ''}${isGuest ? ' pm-guest-public-shell' : ''}${guideLayout ? ' pm-guide-public-shell' : ''}${eventPrototype ? ' pm-events-shell' : ''}`}>
        {discountLabel && <HomeOfferBar discountLabel={discountLabel}/>}
        {showHomeHeader ? <HomeHeader eventsVisible={homeEventsVisible}/> : <SiteHeader active={active} joinLabel={joinLabel}/>}
        <main><PublicPageBannerContext.Provider value={isGuest && Boolean(banner)}>{isGuest && banner && <PublicPageBanner {...banner}/>}{children}</PublicPageBannerContext.Provider></main>
        {!hideFooter && <SiteFooter pricingPrototype={pricingPrototype} variant={homePrototype ? 'home' : footerVariant} homeEventsVisible={homeEventsVisible} homeAiVisible={homeAiVisible} pmpFooterContent={pmpFooterContent}/>}
    </div>;
    return discountLabel
        ? <RewardOfferProvider discountLabel={discountLabel} isMember={Boolean(auth?.user)}>{pageShell}</RewardOfferProvider>
        : pageShell;
}
