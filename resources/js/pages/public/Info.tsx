import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
export default function Info({ title, description }: { title: string; description: string }) {
    return <PublicLayout banner={{title, description}}><Head title={title}/><div className="pm-container pm-page" style={{ minHeight: '60vh' }}><div className="pm-panel pm-content-panel"><LegacyPageHeading><h1>{title}</h1><p>{description}</p></LegacyPageHeading><Link href="/" className="pm-button pm-button-sm mt-5">Back to homepage</Link></div></div></PublicLayout>;
}
