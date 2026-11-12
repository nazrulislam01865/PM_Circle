import { Link, usePage } from '@inertiajs/react';
import { Brand } from '@/components/pm/Brand';

/** The existing public footer, shared by the site and public Discover PM journey. */
export function SiteFooter({ pricingPrototype = false }: { pricingPrototype?: boolean }) {
    const { siteNavigation } = usePage<{ siteNavigation?: { footer: { href: string; label: string }[] } }>().props;
    const links = siteNavigation?.footer ?? [
        { href: '/about', label: 'About' }, { href: '/community', label: 'Community guidelines' },
        { href: '/privacy', label: 'Privacy' }, { href: '/terms', label: 'Terms' },
    ];
    return <footer className="pm-footer"><div className="pm-container pm-footer-inner">
        <Brand small={!pricingPrototype} monogram={pricingPrototype} />
        <nav aria-label="Footer">{links.filter(link => !pricingPrototype || link.href !== '/community').map(link =>
            <Link key={link.href} href={link.href}>{link.label}</Link>)}
            {pricingPrototype && <Link href="/about">Contact</Link>}
        </nav>
        {!pricingPrototype && <p>Building better project professionals together.</p>}
    </div></footer>;
}
