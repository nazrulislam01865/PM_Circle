import { type ReactNode } from 'react';
import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

/** Standard page frame used for additional public and member screens; not a second dashboard shell. */
export function ContentPage({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
    return <PublicLayout><Head title={title}/><div className="pm-container pm-page pm-feature-page">
        <div className="pm-feature-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>
        {children}
    </div></PublicLayout>;
}
export function FeatureEmpty({ title, description, href, linkLabel }: { title: string; description: string; href?: string; linkLabel?: string }) {
    return <div className="pm-panel pm-feature-empty"><strong>{title}</strong><p>{description}</p>{href && <Link href={href} className="pm-button pm-button-sm">{linkLabel ?? 'Explore'}</Link>}</div>;
}
