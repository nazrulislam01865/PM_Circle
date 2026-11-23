import { HomeFooter } from '@/components/home/v2/HomeFooter';
import type { PmpPublicContent } from '@/types/pmp-public';

// Keep existing imports working without retaining a second visual implementation.
export { FooterBrand, FooterSocial } from '@/components/pm/FooterIdentity';

type FooterContent = PmpPublicContent['footer'];
type FooterVariant = 'pmp' | 'contact';

/** Compatibility entry point: both former variants now use the approved homepage footer. */
export function PmpPublicFooter({ content, variant: _variant = 'pmp' }: { content: FooterContent; variant?: FooterVariant }) {
    return <HomeFooter content={content}/>;
}
