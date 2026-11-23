import { Link } from '@inertiajs/react';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import type { PmpPublicContent } from '@/types/pmp-public';

type FooterContent = PmpPublicContent['footer'];

const socialNetworks = [
    { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin },
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
    { key: 'youtube', label: 'YouTube', Icon: Youtube },
] as const;

export function FooterBrand({ content, compact = false }: { content: FooterContent; compact?: boolean }) {
    return <Link href="/" className="pm-brand pm-unified-footer-brand" aria-label={`${content.brand_name} home`}>
        {content.brand_logo
            ? <img src={content.brand_logo} className="pm-unified-footer-brand-image" alt="" />
            : <span className={`pm-brand-icon ${compact ? 'pm-brand-icon-small' : ''}`} aria-hidden="true"><span /></span>}
        <span className="pm-brand-copy"><strong>{content.brand_name}</strong>
            {!compact && content.brand_tagline && <small>{content.brand_tagline}</small>}
        </span>
    </Link>;
}

const prototypeSocialNetworks = [socialNetworks[1], socialNetworks[2], socialNetworks[3], socialNetworks[0]] as const;

export function FooterSocial({ content, compact = false, prototypeOrder = false }: { content: FooterContent; compact?: boolean; prototypeOrder?: boolean }) {
    const networks = prototypeOrder ? prototypeSocialNetworks : socialNetworks;
    const active = networks.filter(({ key }) => Boolean(content.social[key]));
    if (!active.length) return null;
    return <nav className="pm-unified-footer-social" aria-label="Social media">
        {active.map(({ key, label, Icon }) =>
            <a key={key} href={content.social[key]} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} platform`} title={label}>
                {content.social_icons[key] ? <img src={content.social_icons[key]} width={22} height={22} alt=""/> : <Icon size={compact ? 21 : 22} aria-hidden="true"/>}
            </a>)}
    </nav>;
}

