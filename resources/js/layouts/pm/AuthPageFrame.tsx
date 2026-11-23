import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/pm/SiteHeader';
import { HomeHeader } from '@/components/home/v2/HomeHeader';
import { usePage } from '@inertiajs/react';
import { SiteFooter } from '@/components/pm/SiteFooter';
import { HomeOfferBar } from '@/components/home/v2/HomeHero';
import { RewardOfferProvider } from '@/components/rewards/RewardOfferDialog';

type AuthPageFrameProps = {
    children: ReactNode;
    headerPrompt: string;
    headerLinkHref: string;
    headerLinkLabel: string;
    className?: string;
};

/** Login and signup use the same site navigation as the homepage. */
export function AuthPageFrame({ children, className = '' }: AuthPageFrameProps) {
    const { auth, rewardPromotion } = usePage<{ auth?: { user?: unknown | null }; rewardPromotion?: { discountLabel: string } | null }>().props;
    const isGuest = !auth?.user;
    const label = rewardPromotion?.discountLabel;
    const frame = <div className={`pm-app pm-auth-shell${isGuest ? ' pm-home-v2-shell' : ''} ${className}`.trim()}>
        {label && <HomeOfferBar discountLabel={label}/>}
        {isGuest ? <HomeHeader /> : <SiteHeader joinLabel="Join free" />}
        <main className="pm-auth-main">
            {children}
            <p className="pm-auth-bottom">Learn together. Practise daily. Grow your career.</p>
        </main>
        <SiteFooter />
    </div>;
    return label ? <RewardOfferProvider discountLabel={label} isMember={!isGuest}>{frame}</RewardOfferProvider> : frame;
}
