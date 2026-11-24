import { MemberFooter } from '@/components/pm/MemberFooter';
import { HomeFooter } from '@/components/home/v2/HomeFooter';
import { usePage } from '@inertiajs/react';
import type { PmpPublicContent } from '@/types/pmp-public';
import { shouldShowMemberFooter, shouldShowSiteFooter } from '@/components/pm/siteFooterVisibility';

/** One approved footer presentation for public, member and auth pages. */
export function SiteFooter({ member = false, pmpFooterContent, variant, homeEventsVisible = true, homeAiVisible = true }: { member?: boolean; pricingPrototype?: boolean; variant?: 'pmp' | 'contact' | 'home'; homeEventsVisible?: boolean; homeAiVisible?: boolean; pmpFooterContent?: PmpPublicContent['footer'] }) {
    const page = usePage<{ siteFooter?: PmpPublicContent['footer'] }>();
    const content = page.props.siteFooter ?? pmpFooterContent;

    if (member) return shouldShowMemberFooter(page.url) ? <MemberFooter/> : null;

    // Existing Laravel shared props provide the cached footer. Avoid additional frontend requests.
    if (!shouldShowSiteFooter(page.url) || !content) return null;

    return <HomeFooter content={content} eventsVisible={homeEventsVisible} aiVisible={homeAiVisible}/>;
}
