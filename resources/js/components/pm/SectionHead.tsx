import { Link } from '@inertiajs/react';

export function SectionHead({ children, href, linkText }: { children: React.ReactNode; href?: string; linkText?: string }) {
    return <div className="pm-section-head"><h2>{children}</h2>{href && <Link href={href}>{linkText ?? 'View all'} <span aria-hidden="true">→</span></Link>}</div>;
}
