import { Bell } from 'lucide-react';
import { ContentPage, FeatureEmpty } from '@/components/pm/ContentPage';
export default function Notifications() {
    return <ContentPage title="Notifications" subtitle="Updates on replies, learning and important account events.">
        <FeatureEmpty title="No notifications yet" description="New notifications will appear here when in-app notification delivery is enabled. Email verification and password reset messages are handled separately." href="/dashboard" linkLabel="Back to dashboard"/>
        <p className="pm-feature-privacy"><Bell size={16}/> Notifications are private to your account.</p>
    </ContentPage>;
}
