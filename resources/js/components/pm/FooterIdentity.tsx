import { Link } from '@inertiajs/react';
import { Facebook, Github, Globe, Instagram, Link as LinkIcon, Linkedin, Mail, MessageCircle, Twitter, Youtube } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SiteFooterContent } from '@/types/pmp-public';

export const footerSocialIcons = {
    facebook: Facebook, instagram: Instagram, youtube: Youtube, linkedin: Linkedin,
    globe: Globe, mail: Mail, link: LinkIcon, 'message-circle': MessageCircle, github: Github, twitter: Twitter,
};

// Preview values are untrusted until saved. Never render an unsafe href.
export function safeFooterHref(value: string | null): boolean {
    if (!value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
    if (value.startsWith('/')) return !value.startsWith('//');
    try {
        const url = new URL(value);
        return value.startsWith('https://') && url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
}

export function FooterAnchor({ href, children, className, label }: { href: string; children: ReactNode; className?: string; label?: string }) {
    if (!safeFooterHref(href)) return <span className={className}>{children}</span>;
    if (href.startsWith('https://')) return <a href={href} className={className} aria-label={label} target="_blank" rel="noopener noreferrer">{children}</a>;
    if (href.includes('#')) return <a href={href} className={className} aria-label={label}>{children}</a>;
    return <Link href={href} className={className} aria-label={label}>{children}</Link>;
}

export function FooterBrand({ content, compact = false }: { content: SiteFooterContent; compact?: boolean }) {
    return <FooterAnchor href={content.brand_href} className="pm-brand pm-unified-footer-brand" label={content.brand_name}>
        {content.brand_logo
            ? <img src={content.brand_logo} className="pm-unified-footer-brand-image" alt="" />
            : <span className={`pm-brand-icon ${compact ? 'pm-brand-icon-small' : ''}`} aria-hidden="true"><span /></span>}
        <span className="pm-brand-copy"><strong>{content.brand_name}</strong>
            {!compact && content.brand_tagline && <small>{content.brand_tagline}</small>}
        </span>
    </FooterAnchor>;
}

export function FooterSocial({ content, compact = false }: { content: SiteFooterContent; compact?: boolean }) {
    const active = content.socials.filter(item => item.href?.startsWith('https://') && safeFooterHref(item.href));
    if (!active.length) return null;
    return <nav className="pm-unified-footer-social" aria-label="Social media">
        {active.map((item, index) => {
            const Icon = footerSocialIcons[item.icon as keyof typeof footerSocialIcons] ?? Globe;
            return <a key={index} href={item.href ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}>
                {item.image ? <img src={item.image} width={22} height={22} alt=""/> : <Icon size={compact ? 21 : 22} aria-hidden="true"/>}
            </a>;
        })}
    </nav>;
}
