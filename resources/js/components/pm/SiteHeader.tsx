import type { ReactNode } from 'react';
import { MemberHomeHeader } from '@/components/dashboard/MemberHomeHeader';

type HeaderProps = {
    active?: string;
    /** Guest registration call-to-action label. */
    joinLabel?: string;
    actions?: ReactNode;
    brandPlacement?: 'always' | 'mobile';
    brandHref?: string;
};

/** Both guests and signed-in members render the same shared navigation component. */
export function SiteHeader({ active, actions, brandHref, joinLabel }: HeaderProps) {
    return <MemberHomeHeader active={active} actions={actions} brandHref={brandHref} joinLabel={joinLabel} />;
}
