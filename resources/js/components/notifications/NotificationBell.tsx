import { Link } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NotificationList } from './NotificationList';
import { useNotificationCenter } from './NotificationCenter';

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const { unread, markAllRead, refresh } = useNotificationCenter();
    useEffect(() => {
        if (!open) return;
        const closeOnOutside = (event: PointerEvent) => {
            if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', closeOnOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => { document.removeEventListener('pointerdown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
    }, [open]);
    return <div className="pm-notification-bell-root" ref={root}>
        <button type="button" className="pm-dash-bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={open} aria-haspopup="dialog" aria-controls="pm-notification-dropdown"
            onClick={() => { setOpen(value => !value); if (!open) void refresh(); }}>
            <Bell size={23}/>{unread > 0 && <span className="pm-notification-count">{unread > 99 ? '99+' : unread}</span>}
        </button>
        {open && <div id="pm-notification-dropdown" role="dialog" aria-label="Your notifications" className="pm-notification-dropdown">
            <div className="pm-notification-title"><strong>Notifications</strong>{unread > 0 && <button type="button" onClick={() => void markAllRead()}>Mark all read</button>}</div>
            <NotificationList compact onSelect={() => setOpen(false)}/>
            <Link className="pm-notification-view-all" href="/dashboard/features/notifications" onClick={() => setOpen(false)}>View all notifications</Link>
        </div>}
    </div>;
}
