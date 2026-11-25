import { Head } from '@inertiajs/react';
import { UserRoundX } from 'lucide-react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { FeatureEmpty } from '@/components/pm/ContentPage';

export default function Unavailable() {
    return <PublicLayout active="/members" banner={{title: 'Profile unavailable', parents: [{label: 'Members', href: '/members'}]}}>
        <Head title="Profile unavailable"/>
        <div className="pm-container pm-page pm-feature-page">
            <FeatureEmpty title="Profile unavailable" description="This member’s public profile is not available." href="/members" linkLabel="View member directory" icon={<UserRoundX size={28}/>}/>
        </div>
    </PublicLayout>;
}
