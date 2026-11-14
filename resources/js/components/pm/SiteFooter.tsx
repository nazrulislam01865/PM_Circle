import { PmpPublicFooter } from '@/components/exam/PmpPublicFooter';
import { usePage } from '@inertiajs/react';
import type { PmpPublicContent } from '@/types/pmp-public';
import { shouldShowSiteFooter } from '@/components/pm/siteFooterVisibility';

/** Reusable footer for every existing public/learning page, with a compact contact variant. */
export function SiteFooter({ pmpFooterContent, variant }: { pricingPrototype?: boolean; variant?: 'pmp' | 'contact'; pmpFooterContent?: PmpPublicContent['footer'] }) {
    const page = usePage<{ siteFooter?: PmpPublicContent['footer'] }>();
    const content = pmpFooterContent ?? page.props.siteFooter;

    // Existing Laravel shared props provide the cached footer. Avoid additional frontend requests.
    if (!shouldShowSiteFooter(page.url) || !content) return null;

    return <PmpPublicFooter content={content} variant={variant ?? 'pmp'}/>;
}
