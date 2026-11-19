import type { ReactNode } from 'react';
import { MemberHomeHeader } from '@/components/dashboard/MemberHomeHeader';
import { MemberSecondaryNavigation } from '@/components/dashboard/MemberSecondaryNavigation';
import { usePage } from '@inertiajs/react';
import type { DashboardShellData } from '@/types/dashboard';
import { NotificationCenterProvider } from '@/components/notifications/NotificationCenter';

type HeaderProps = {
    active?: string;
    /** Guest registration call-to-action label. */
    joinLabel?: string;
    actions?: ReactNode;
    brandPlacement?: 'always' | 'mobile';
    brandHref?: string;
    authenticatedMemberNavigation?: boolean;
};

/** Both guests and signed-in members render the same shared navigation component. */
export function SiteHeader({ active, actions, brandHref, joinLabel, authenticatedMemberNavigation = false }: HeaderProps) {
    const { auth, memberShell } = usePage<{ auth?: { user?: { is_admin?: boolean } | null }; memberShell?: DashboardShellData | null }>().props;
    if (authenticatedMemberNavigation && memberShell && auth?.user && !auth.user.is_admin) {
        return <NotificationCenterProvider><div className="pm-member-exam-navigation">
            <MemberHomeHeader dashboard={memberShell} active={active} actions={actions} brandHref={brandHref} joinLabel={joinLabel} />
            <MemberSecondaryNavigation />
        </div></NotificationCenterProvider>;
    }
    return <NotificationCenterProvider><MemberHomeHeader active={active} actions={actions} brandHref={brandHref} joinLabel={joinLabel} /></NotificationCenterProvider>;
}
