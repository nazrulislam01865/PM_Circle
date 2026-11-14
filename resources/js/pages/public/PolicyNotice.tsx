import { Head, Link } from '@inertiajs/react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';

export default function PolicyNotice() {
    return <PublicLayout siteLayout>
        <Head title="Refund Policy | PM Circle"/>
        <div className="pm-container pm-page"><section className="pm-panel pm-content-panel">
            <h1>Refund Policy</h1>
            <p>The refund policy has not been published yet. Please <Link href="/contact">contact support</Link> before making a purchase.</p>
        </section></div>
    </PublicLayout>;
}
