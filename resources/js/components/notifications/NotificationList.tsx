import { Link } from '@inertiajs/react';
import { Bell, ChevronRight } from 'lucide-react';
import { useNotificationCenter, type Notification } from './NotificationCenter';

function safeUrl(value: string): string {
    return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard/features/notifications';
}

export function NotificationItem({ item, onSelect }: { item: Notification; onSelect?: () => void }) {
    const { markRead } = useNotificationCenter();
    return <Link href={safeUrl(item.url)} className={`pm-notification-item${item.read_at ? '' : ' is-unread'}`}
        onClick={() => { void markRead(item.id); onSelect?.(); }}>
        <span className="pm-notification-icon" aria-hidden="true"><Bell size={17}/></span>
        <span className="pm-notification-copy"><span>{item.message}</span><small>{new Date(item.created_at).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' })}</small></span>
        {!item.read_at && <span className="pm-notification-unread-dot" aria-label="Unread"/>}
        <ChevronRight size={16} aria-hidden="true"/>
    </Link>;
}

export function NotificationList({ compact = false, onSelect }: { compact?: boolean; onSelect?: () => void }) {
    const { items, loading, error, hasMore, loadMore, refresh } = useNotificationCenter();
    const displayed = compact ? items.slice(0, 5) : items;
    if (loading && !items.length) return <p className="pm-notification-message" role="status">Loading notifications…</p>;
    if (error && !displayed.length) return <div className="pm-notification-message" role="alert">Notifications are temporarily unavailable. <button type="button" onClick={() => void refresh()}>Try again</button></div>;
    if (!displayed.length) return <p className="pm-notification-message">No notifications yet. New activity will appear here.</p>;
    return <div className="pm-notification-list">
        {displayed.map(item => <NotificationItem key={item.id} item={item} onSelect={onSelect}/>)}
        {!compact && hasMore && <button type="button" className="pm-notification-more" onClick={() => void loadMore()}>Load older notifications</button>}
    </div>;
}
