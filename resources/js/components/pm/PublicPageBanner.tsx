import { Link } from '@inertiajs/react';
import { createContext, useContext, type ReactNode } from 'react';

export type PublicPageBannerData = {
    title: string;
    description?: string;
    parents?: readonly { label: string; href: string }[];
    currentLabel?: string;
    titleId?: string;
    homeHref?: string;
};

export const PublicPageBannerContext = createContext(false);
export function usePublicPageBanner() { return useContext(PublicPageBannerContext); }

/** Keep existing member headings; the shared banner owns the page title when enabled. */
export function LegacyPageHeading({ children }: { children: ReactNode }) {
    return usePublicPageBanner() ? null : <>{children}</>;
}

/** The approved Browse Exam Simulators banner, shared by public content pages. */
export function PublicPageBanner({ title, description, parents = [], currentLabel, titleId = 'pm-public-page-title', homeHref = '/' }: PublicPageBannerData) {
    return <section className="pm-sim-banner pm-public-page-banner" aria-labelledby={titleId}>
        <div className="pm-v2-container">
            <nav className="pm-sim-breadcrumb" aria-label="Breadcrumb">
                <Link href={homeHref}>Home</Link>
                {parents.map(parent => <span className="pm-public-breadcrumb-parent" key={parent.href}><span aria-hidden="true">/</span><Link href={parent.href}>{parent.label}</Link></span>)}
                <span aria-hidden="true">/</span><span aria-current="page">{currentLabel ?? title}</span>
            </nav>
            <h1 id={titleId}>{title}</h1>
            {description && <p>{description}</p>}
        </div>
    </section>;
}
