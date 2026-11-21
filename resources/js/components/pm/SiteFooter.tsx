import { PmpPublicFooter } from '@/components/exam/PmpPublicFooter';
import { HomeFooter } from '@/components/home/v2/HomeFooter';
import { usePage } from '@inertiajs/react';
import type { PmpPublicContent } from '@/types/pmp-public';
import { shouldShowSiteFooter } from '@/components/pm/siteFooterVisibility';

/** Reusable footer for every existing public/learning page, with a compact contact variant. */
export function SiteFooter({ pmpFooterContent, variant, homeEventsVisible = true, homeAiVisible = true }: { pricingPrototype?: boolean; variant?: 'pmp' | 'contact' | 'home'; homeEventsVisible?: boolean; homeAiVisible?: boolean; pmpFooterContent?: PmpPublicContent['footer'] }) {
    const page = usePage<{ siteFooter?: PmpPublicContent['footer'] }>();
    const content = pmpFooterContent ?? page.props.siteFooter;

    // Existing Laravel shared props provide the cached footer. Avoid additional frontend requests.
    if (!shouldShowSiteFooter(page.url) || !content) return null;

    return variant === 'home' ? <HomeFooter content={content} eventsVisible={homeEventsVisible} aiVisible={homeAiVisible}/> : <PmpPublicFooter content={content} variant={variant ?? 'pmp'}/>;
}
