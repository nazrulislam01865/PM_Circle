import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
export default function Info({ title, description }: { title: string; description: string }) {
    return <PublicLayout><Head title={title}/><div className="pm-container pm-page" style={{ minHeight: '60vh' }}><div className="pm-panel pm-content-panel"><h1>{title}</h1><p>{description}</p><Link href="/" className="pm-button pm-button-sm mt-5">Back to homepage</Link></div></div></PublicLayout>;
}
