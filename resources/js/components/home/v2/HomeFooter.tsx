import { Link } from '@inertiajs/react';
import { FooterBrand, FooterSocial } from '@/components/exam/PmpPublicFooter';
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

/** Homepage grouping only: never alter the saved footer links or the admin editor. */
export function HomeFooter({ content, eventsVisible = true, aiVisible = true }: { content: FooterData; eventsVisible?: boolean; aiVisible?: boolean }) {
    const explore = content.show_explore !== false ? content.explore_links : [];
    const support = content.show_support !== false ? content.support_links : [];
    const legal = content.show_legal !== false ? content.legal_links : [];
    const classify = (href: string) => {
        if (/learning|course|simulator|exams|practice|ai-tool/i.test(href)) return 'learning';
        if (/community|members|challenge|scenario|events|posts/i.test(href)) return 'community';
        return 'company';
    };
    const learning = explore.filter(link => classify(link.href) === 'learning');
    const community = explore.filter(link => classify(link.href) === 'community');
    const company = explore.filter(link => classify(link.href) === 'company');
    const supportCompany = support.filter(link => /about|contact|help|testimonial/i.test(link.href));
    const supportOther = support.filter(link => !/about|contact|help|testimonial/i.test(link.href));

    // Use only real public destinations. Explicit admin destinations and custom labels take precedence.
    const companyLinks: LinkData[] = content.show_explore === false && content.show_support === false ? [] : uniqueLinks([
        ...(content.show_explore !== false ? [{ href: '/about', label: 'About Us' }] : []),
        ...company,
        ...supportCompany,
        ...(content.show_explore !== false && !company.length && !supportCompany.length ? [
            { href: '/contact', label: 'Contact' },
            { href: '/help-center', label: 'Help Centre' },
        ] : []),
    ]);
    // Preserve administrator-edited labels; only display the prototype wording for built-in defaults.
    const prototypeLink = (links: LinkData[], href: string, label: string, defaults: string[] = []): LinkData => {
        const configured = links.find(link => link.href === href);
        return configured ? { ...configured, label: defaults.includes(configured.label) ? label : configured.label } : { href, label };
    };
    const learningLinks = content.show_explore === false ? [] : uniqueLinks([
        prototypeLink(learning, '/exam-simulator/pmp', 'Exam Simulator'),
        prototypeLink(learning, '/learning', 'Courses', ['Learn & Practice']),
        ...learning,
        ...(aiVisible ? [{ href: '/#pm-v2-ai', label: 'AI Tools' }] : []),
    ]);
    const communityLinks = content.show_explore === false ? [] : uniqueLinks([
        prototypeLink(community, '/community', 'Community Feed', ['Community']),
        prototypeLink(community, '/daily-challenge', 'Daily Challenge'),
        ...community,
        ...(eventsVisible ? [{ href: '/events', label: 'Events' }] : []),
    ]);
    const plans = uniqueLinks([
        ...(content.show_membership ? [{ href: '/pricing', label: 'Compare Plans' }] : []),
        ...legal.filter(link => link.href === '/privacy'),
        ...legal.filter(link => link.href === '/terms'),
        ...legal.filter(link => link.href === '/refund-policy'),
        ...legal,
        ...supportOther,
    ]);
    const showBrand = content.show_brand !== false || content.show_about !== false || content.show_social !== false;

    return <footer className="pm-v2-site-footer" aria-label="PM Circle footer"><div className="pm-v2-container">
        <div className="pm-v2-footer-grid">
            {showBrand && <section className="pm-v2-footer-identity">
                {content.show_brand !== false && <FooterBrand content={content}/>}
                {content.show_about !== false && <p>{content.description}</p>}
                {content.show_social !== false && <FooterSocial content={content} compact prototypeOrder/>}
            </section>}
            <FooterLinks title={content.explore_heading && content.explore_heading !== 'Explore' ? content.explore_heading : 'Company'} items={companyLinks}/>
            <FooterLinks title="Learning" items={learningLinks}/>
            <FooterLinks title="Community" items={communityLinks}/>
            <FooterLinks title="Plans & Policies" items={plans}/>
        </div>
        {content.show_payments !== false && content.payment_methods.length > 0 && <div className="pm-v2-footer-payments"><strong>{content.payment_heading}</strong>
            {content.payment_methods.map((item, i) => <span key={`${item.label}-${i}`}>{item.image ? <img src={item.image} alt={item.label}/> : item.label}</span>)}
        </div>}
        {content.show_legal !== false && <div className="pm-v2-footer-legal">
            {content.legal_notice && <p>{content.legal_notice}</p>}
            {content.show_disclaimer && content.disclaimer && <p>{content.disclaimer}</p>}
            <div className="pm-v2-footer-last"><span>© {new Date().getFullYear()} {content.copyright_label}</span></div>
        </div>}
    </div></footer>;
}
