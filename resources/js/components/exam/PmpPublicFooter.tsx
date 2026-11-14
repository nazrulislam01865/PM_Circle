import { Link } from '@inertiajs/react';
import { Facebook, Github, Linkedin, Youtube } from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import type { PmpPublicContent } from '@/types/pmp-public';

type FooterContent = PmpPublicContent['footer'];
type FooterVariant = 'pmp' | 'contact';

const SOCIAL_NETWORKS = [
    { key: 'linkedin' as const, label: 'LinkedIn', Icon: Linkedin },
    { key: 'facebook' as const, label: 'Facebook', Icon: Facebook },
    { key: 'youtube' as const, label: 'YouTube', Icon: Youtube },
];

function FooterSocial({ content, compact = false }: { content: FooterContent; compact?: boolean }) {
    return <nav className="pm-unified-footer-social" aria-label="Social media">
        {SOCIAL_NETWORKS.filter(item => !compact || item.key !== 'facebook').map(({ key, label, Icon }) =>
            <a key={key} href={content.social[key]} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label} platform`} title={label}>
                {content.social_icons[key] ? <img src={content.social_icons[key]} width={22} height={22} alt=""/> : <Icon size={22} aria-hidden="true"/>}
            </a>)}
        {compact && <a href="https://github.com/" target="_blank" rel="noopener noreferrer" title="GitHub platform" aria-label="Open GitHub platform"><Github size={21} aria-hidden="true"/></a>}
    </nav>;
}

function FooterNewsletter({ heading, compact = false, placeholder, button }: { heading: string; compact?: boolean; placeholder: string; button: string }) {
    return <section className="pm-unified-footer-subscribe" aria-label="Email updates">
        <h2>{heading}</h2>
        {compact ? <p>Get community updates and learning resources by email.</p> : <p>Get new learning resources and community updates.</p>}
        <div className="pm-unified-footer-subscribe-row">
            <label htmlFor={compact ? 'pm-footer-email-compact' : 'pm-footer-email'} className="pm-visually-hidden">Email address</label>
            <input id={compact ? 'pm-footer-email-compact' : 'pm-footer-email'} type="email" placeholder={placeholder} aria-label="Email address" disabled title="Newsletter sign-up is not available yet"/>
            <button type="button" disabled title="Newsletter sign-up is not available yet">{button}</button>
        </div>
    </section>;
}

/** The same footer component supplies the full dark footer and the compact contact-page variant. */
export function PmpPublicFooter({ content, variant = 'pmp' }: { content: FooterContent; variant?: FooterVariant }) {
    const explore = content.explore_links.map(item => ({...item, label: item.label === 'Community' && variant !== 'contact' ? 'Community Feed' : item.label === 'Exam Simulator' && variant !== 'contact' ? 'Exam Simulators' : item.label }));
    const hasTrends = explore.some(item => item.href === '/pm-trends');
    const support = content.support_links.filter(item => !['/privacy', '/terms'].includes(item.href)).map(item => ({...item, label: item.label === 'Contact' ? 'Contact us' : item.label === 'Help Center' && variant !== 'contact' ? 'Help Centre' : item.label }));
    const hasMembership = support.some(item => item.href === '/pricing');
    const newsletterHeading = content.newsletter_heading === 'Stay in the loop' ? (variant === 'contact' ? 'Subscribe' : 'Subscribe for updates') : content.newsletter_heading;

    if (variant === 'contact') return <footer className="pm-unified-footer pm-unified-footer-compact">
        <div className="pm-container pm-unified-footer-container pm-unified-footer-compact-grid">
            <div className="pm-unified-footer-identity"><Brand small/><p>{content.description}</p></div>
            <nav aria-label="Explore links"><h2>{content.explore_heading}</h2>{content.explore_links.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}</nav>
            <nav aria-label="Support links"><h2>{content.support_heading}</h2>{content.support_links.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}</nav>
            <FooterNewsletter heading={newsletterHeading} placeholder={content.newsletter_placeholder} button={content.newsletter_button} compact/>
            <FooterSocial content={content} compact/>
        </div>
    </footer>;

    return <footer className="pm-unified-footer pm-unified-footer-dark">
        <div className="pm-container pm-unified-footer-container">
            <div className="pm-unified-footer-grid">
                <section className="pm-unified-footer-identity"><Brand/><h2>About us</h2><p>{content.description}</p><FooterSocial content={content}/></section>
                <nav aria-label="Quick links"><h2>{content.explore_heading === 'Explore' ? 'Quick links' : content.explore_heading}</h2>{explore.map((item, i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}{!hasTrends && <Link href="/pm-trends">PM Trends</Link>}</nav>
                <nav aria-label="Support links"><h2>{content.support_heading}</h2>{support.map((item,i) => <Link href={item.href} key={`${item.href}:${i}`}>{item.label}</Link>)}{!hasMembership && <Link href="/pricing">Membership plans</Link>}</nav>
                <FooterNewsletter heading={newsletterHeading} placeholder={content.newsletter_placeholder} button={content.newsletter_button}/>
            </div>
            <div className="pm-unified-footer-payments"><strong>Payment options</strong><span>stripe</span><span>SSLCOMMERZ</span><span>bKash</span><span>Nagad</span></div>
        </div>
        <div className="pm-unified-footer-bottom"><div className="pm-container pm-unified-footer-container"><div className="pm-unified-footer-legal-links"><span>© {new Date().getFullYear()} PM Circle by ITQAN.</span><Link href="/terms">Terms of Use</Link><Link href="/privacy">Privacy Policy</Link><Link href="/refund-policy">Refund Policy</Link></div><p>PMP is a registered mark of Project Management Institute, Inc.</p></div></div>
    </footer>;
}
