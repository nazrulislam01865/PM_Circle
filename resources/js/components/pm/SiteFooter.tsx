import { Link } from '@inertiajs/react';
import { Brand } from '@/components/pm/Brand';

/** The existing public footer, shared by the site and public Discover PM journey. */
export function SiteFooter({ pricingPrototype = false }: { pricingPrototype?: boolean }) {
    return <footer className="pm-footer"><div className="pm-container pm-footer-inner">
        <Brand small={!pricingPrototype} monogram={pricingPrototype} />
        <nav aria-label="Footer"><Link href="/about">About</Link>
            {!pricingPrototype && <Link href="/community">Community guidelines</Link>}
            <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>
            {pricingPrototype && <Link href="/about">Contact</Link>}
        </nav>
        {!pricingPrototype && <p>Building better project professionals together.</p>}
    </div></footer>;
}
