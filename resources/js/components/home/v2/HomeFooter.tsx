import { Link } from '@inertiajs/react';
import { trademarkNotice } from '@/components/pm/trademarkNotice';
import { FooterBrand, FooterSocial } from '@/components/pm/FooterIdentity';
import type { PmpPublicContent } from '@/types/pmp-public';

type FooterData = PmpPublicContent['footer'];
type LinkData = { href: string; label: string };

function FooterLinks({ title, items }: { title: string; items: LinkData[] }) {
    if (!items.length) return null;
    return <nav aria-label={title}><h2>{title}</h2>{items.map((link, index) =>
        link.href.startsWith('/#')
            ? <a href={link.href} key={`${link.href}-${index}`}>{link.label}</a>
            : <Link href={link.href} key={`${link.href}-${index}`}>{link.label}</Link>)}</nav>;
}

function uniqueLinks(links: LinkData[]): LinkData[] {
    const seen = new Set<string>();
    return links.filter(({ href }) => {
        const key = href.replace(/\/$/, '') || '/';
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** The same five-column, prototype-copy footer is shared by every ordinary page.
 * Only approved administrator settings control brand imagery, social URLs and
 * optional link group visibility; no page supplies its own footer wording.
 */
export function HomeFooter({ content, eventsVisible = true, aiVisible = true }: { content: FooterData; eventsVisible?: boolean; aiVisible?: boolean }) {
    const explore = content.show_explore !== false ? content.explore_links : [];
    const support = content.show_support !== false ? content.support_links : [];
    const legal = content.show_legal !== false ? content.legal_links : [];
    const prototypeLink = (links: LinkData[], href: string, label: string): LinkData => {
        const configured = links.find(link => link.href === href);
        return configured ? { ...configured, label } : { href, label };
    };
    const companyLinks: LinkData[] = content.show_explore === false && content.show_support === false ? [] : uniqueLinks([
        ...(content.show_explore !== false ? [
            prototypeLink(explore, '/about', 'About Us'),
            { href: '/exam-simulator/pmp#learner-testimonials', label: 'Testimonials' },
            ...(content.show_trends !== false ? [{ href: '/pm-trends', label: 'Trends' }] : []),
        ] : []),
        ...(content.show_support !== false ? [prototypeLink(support, '/help-center', 'Help Centre')] : []),
    ]);
    const learningLinks = content.show_explore === false ? [] : uniqueLinks([
        prototypeLink(explore, '/exam-simulator/pmp', 'Exam Simulator'),
        prototypeLink(explore, '/learning', 'Courses'),
        { href: '/#pm-v2-ai', label: 'AI Tools' },
    ]);
    const communityLinks = content.show_explore === false ? [] : uniqueLinks([
        prototypeLink(explore, '/community', 'Community Feed'),
        prototypeLink(explore, '/daily-challenge', 'Daily Challenge'),
        { href: '/events', label: 'Events' },
        { href: '/terms#community', label: 'Community Guidelines' },
    ]);
    const plans: LinkData[] = [
        ...(content.show_membership !== false ? [
            { href: '/pricing', label: 'Compare Plans' },
            { href: '/pricing', label: 'How to Purchase' },
        ] : []),
        ...(content.show_legal !== false ? [
            prototypeLink(legal, '/privacy', 'Privacy Policy'),
            prototypeLink(legal, '/terms', 'Terms and Conditions'),
            prototypeLink(legal, '/refund-policy', 'Refund Policy'),
        ] : []),
    ];
    const prototypeDescription = 'Learn project management, practise for certification, and connect with peers.';

    const showBrand = content.show_brand !== false || content.show_about !== false || content.show_social !== false;

    return <footer className="pm-v2-site-footer" aria-label="PM Circle footer"><div className="pm-v2-container">
        <div className="pm-v2-footer-grid">
            {showBrand && <section className="pm-v2-footer-identity">
                {content.show_brand !== false && <FooterBrand content={content}/>}
                {content.show_about !== false && <p>{prototypeDescription}</p>}
                {content.show_social !== false && <FooterSocial content={content} compact prototypeOrder/>}
            </section>}
            <FooterLinks title="Company" items={companyLinks}/>
            <FooterLinks title="Learning" items={learningLinks}/>
            <FooterLinks title="Community" items={communityLinks}/>
            <FooterLinks title="Plans & Policies" items={plans}/>
        </div>
        {content.show_legal !== false && <div className="pm-v2-footer-legal">
            <p><strong>Trademark notice.</strong> {trademarkNotice}</p>
            <div className="pm-v2-footer-last"><span>© PM Circle by ITQAN</span></div>
        </div>}
    </div></footer>;
}
