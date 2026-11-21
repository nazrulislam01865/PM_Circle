import { Link } from '@inertiajs/react';
import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import type { PmpPublicContent } from '@/types/pmp-public';

type FooterContent = PmpPublicContent['footer'];
type FooterVariant = 'pmp' | 'contact';

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

function FooterNewsletter({ content, compact = false }: { content: FooterContent; compact?: boolean }) {
    return <section className="pm-unified-footer-subscribe" aria-label="Email updates">
        <h2>{content.newsletter_heading}</h2>
        <p>{compact ? content.newsletter_compact_description : content.newsletter_description}</p>
        {content.show_newsletter_form !== false && <div className="pm-unified-footer-subscribe-row">
            <label htmlFor={compact ? 'pm-footer-email-compact' : 'pm-footer-email'} className="pm-visually-hidden">Email address</label>
            <input id={compact ? 'pm-footer-email-compact' : 'pm-footer-email'} type="email" placeholder={content.newsletter_placeholder} aria-label="Email address" disabled title="Newsletter sign-up is not available yet"/>
            <button type="button" disabled title="Newsletter sign-up is not available yet">{content.newsletter_button}</button>
        </div>}
    </section>;
}

/** One centrally configured footer for both public and compact variants. */
export function PmpPublicFooter({ content, variant = 'pmp' }: { content: FooterContent; variant?: FooterVariant }) {
    const explore = content.explore_links;
    const support = content.support_links;
    const showSocial = content.show_social !== false && socialNetworks.some(({ key }) => Boolean(content.social[key]));
    const showBrandColumn = content.show_brand !== false || content.show_about !== false || showSocial;
    const showExplore = content.show_explore !== false;
    const showSupport = content.show_support !== false;
    const showNewsletter = content.show_newsletter !== false;
    const hasTrends = explore.some(item => item.href === '/pm-trends');
    const hasMembership = support.some(item => item.href === '/pricing');
    const gridCount = [showBrandColumn, showExplore, showSupport, showNewsletter].filter(Boolean).length;
    const compactGridCount = gridCount + (showSocial ? 1 : 0);

    if (variant === 'contact') return <footer className="pm-unified-footer pm-unified-footer-compact">
        <div className={`pm-container pm-unified-footer-container pm-unified-footer-compact-grid ${compactGridCount < 5 ? 'pm-unified-footer-compact-grid-adjustable' : ''}`}>
            {showBrandColumn && <section className="pm-unified-footer-identity">
                {content.show_brand !== false && <FooterBrand content={content} compact/>}
                {content.show_about !== false && <p>{content.description}</p>}
            </section>}
            {showExplore && <nav aria-label="Explore links"><h2>{content.explore_heading}</h2>{explore.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}</nav>}
            {showSupport && <nav aria-label="Support links"><h2>{content.support_heading}</h2>{support.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}</nav>}
            {showNewsletter && <FooterNewsletter content={content} compact/>}
            {showSocial && <FooterSocial content={content} compact/>}
        </div>
    </footer>;

    return <footer className="pm-unified-footer pm-unified-footer-dark">
        <div className="pm-container pm-unified-footer-container">
            {gridCount > 0 && <div className={`pm-unified-footer-grid ${gridCount < 4 ? 'pm-unified-footer-grid-adjustable' : ''}`}>
                {showBrandColumn && <section className="pm-unified-footer-identity">
                    {content.show_brand !== false && <FooterBrand content={content}/>}
                    {content.show_about !== false && <><h2>{content.about_heading}</h2><p>{content.description}</p></>}
                    {showSocial && <FooterSocial content={content}/>}
                </section>}
                {showExplore && <nav aria-label="Quick links"><h2>{content.explore_heading}</h2>{explore.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}
                    {content.show_trends && !hasTrends && <Link href="/pm-trends">PM Trends</Link>}</nav>}
                {showSupport && <nav aria-label="Support links"><h2>{content.support_heading}</h2>{support.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}
                    {content.show_membership && !hasMembership && <Link href="/pricing">Membership plans</Link>}</nav>}
                {showNewsletter && <FooterNewsletter content={content}/>}
            </div>}
            {content.show_payments !== false && content.payment_methods.length > 0 && <div className="pm-unified-footer-payments"><strong>{content.payment_heading}</strong>
                {content.payment_methods.map((method, index) => <span key={`${method.label}-${index}`}>
                    {method.image ? <img src={method.image} alt={method.label} className="pm-unified-footer-payment-image"/> : method.label}
                </span>)}
            </div>}
        </div>
        {content.show_legal !== false && <div className="pm-unified-footer-bottom"><div className="pm-container pm-unified-footer-container">
            <div className="pm-unified-footer-legal-links"><span>© {new Date().getFullYear()} {content.copyright_label}</span>
                {content.legal_links.map((item, index) => <Link key={`${item.href}-${index}`} href={item.href}>{item.label}</Link>)}
            </div>
            <p>{content.legal_notice}</p>
            {content.show_disclaimer && <p className="pm-unified-footer-disclaimer">{content.disclaimer}</p>}
        </div></div>}
    </footer>;
}
