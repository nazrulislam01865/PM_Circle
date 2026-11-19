import { Bell } from 'lucide-react';
import { ContentPage } from '@/components/pm/ContentPage';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotificationCenter } from '@/components/notifications/NotificationCenter';

function NotificationPageBody() {
    const { unread, markAllRead } = useNotificationCenter();
    return <>
        <section className="pm-panel pm-notification-page-list">
            {unread > 0 && <div className="pm-notification-title"><strong>{unread} unread</strong><button type="button" onClick={() => void markAllRead()}>Mark all as read</button></div>}
            <NotificationList/>
        </section>
        <p className="pm-feature-privacy"><Bell size={16}/> Notifications are private to your account. Realtime connection problems do not remove saved notifications.</p>
    </>;
}

export default function Notifications() {
    return <ContentPage title="Notifications" subtitle="Activity on your posts, replies, follows and challenge discussions.">
        <NotificationPageBody/>
    </ContentPage>;
}
