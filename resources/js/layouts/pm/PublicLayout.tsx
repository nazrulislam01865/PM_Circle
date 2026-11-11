import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/pm/SiteFooter';
import { SiteHeader } from '@/components/pm/SiteHeader';
import { MemberDashboardLayout } from '@/layouts/pm/MemberDashboardLayout';
import type { DashboardShellData } from '@/types/dashboard';

type AuthProps = { auth: { user: { name: string; onboarding_step: number } | null }; memberShell: DashboardShellData | null };
export function PublicLayout({ children, active, joinLabel = 'Join the community', pricingPrototype = false, memberVariant, siteLayout = false }: { children: ReactNode; active?: string; joinLabel?: string; pricingPrototype?: boolean; memberVariant?: 'learning-catalog'; siteLayout?: boolean }) {
    const { auth, memberShell } = usePage<AuthProps>().props;
    // Homepage-style public pages use one site header at every membership tier.
    // Other member routes retain their existing dashboard/sidebar functionality.
    if (!siteLayout && auth?.user && memberShell && auth.user.onboarding_step >= 3) {
        return <MemberDashboardLayout dashboard={memberShell} variant={memberVariant}><div className="pm-member-public-content">{children}</div></MemberDashboardLayout>;
    }
    return <div className={pricingPrototype ? 'pm-app pm-pricing-shell' : 'pm-app'}>
        <SiteHeader active={active} joinLabel={joinLabel}/>
        <main>{children}</main>
        <SiteFooter pricingPrototype={pricingPrototype}/>
    </div>;
}
