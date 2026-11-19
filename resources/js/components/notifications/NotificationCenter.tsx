import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import type Pusher from 'pusher-js';

type Notification = {
    id: string;
    type: string;
    message: string;
    url: string;
    read_at: string | null;
    created_at: string;
};
type Feed = { items: Notification[]; next_cursor: string | null; unread_count: number };
type Transport = { key: string; cluster?: string; host?: string; port?: number; secure?: boolean } | null;
type Realtime = { pusher: Transport; reverb: Transport } | null;
type NotificationContextValue = {
    items: Notification[];
    unread: number;
    loading: boolean;
    error: boolean;
    hasMore: boolean;
    refresh: () => Promise<void>;
    loadMore: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
};

const Context = createContext<NotificationContextValue | null>(null);
const feedUrl = '/notifications/feed';

async function getFeed(cursor?: string): Promise<Feed> {
    const url = cursor ? `${feedUrl}?cursor=${encodeURIComponent(cursor)}` : feedUrl;
    const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load notifications');
    return (await response.json()) as Feed;
}
async function updateRead(url: string): Promise<void> {
    const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(url, {
        method: 'POST', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
    });
    if (!response.ok) throw new Error('Could not update notifications');
}

/** Mounted once per member shell so its bell and notification page share one connection. */
export function NotificationCenterProvider({ children }: { children: ReactNode }) {
    const page = usePage<{
        auth?: { user?: { id: number; is_admin?: boolean; onboarding_step?: number; email_verified_at?: string | null } | null };
        emailVerificationRequired?: boolean;
        notificationRealtime?: Realtime;
    }>();
    const user = page.props.auth?.user;
    const memberId = user && !user.is_admin && (user.onboarding_step ?? 0) >= 3
        && (!page.props.emailVerificationRequired || user.email_verified_at)
        ? user.id : null;
    const realtime = page.props.notificationRealtime ?? null;
    const [items, setItems] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const fetchSequence = useRef(0);

    const refresh = useCallback(async () => {
        if (!memberId) return;
        const sequence = ++fetchSequence.current;
        try {
            const feed = await getFeed();
            if (fetchSequence.current !== sequence) return;
            setError(false);
            setItems(feed.items);
            setUnread(feed.unread_count);
            setNextCursor(feed.next_cursor);
        } catch {
            // Keep already loaded notifications when temporarily offline.
            if (fetchSequence.current === sequence) setError(true);
        } finally {
            if (fetchSequence.current === sequence) setLoading(false);
        }
    }, [memberId]);

    const loadMore = useCallback(async () => {
        if (!nextCursor) return;
        const cursor = nextCursor;
        const sequence = fetchSequence.current;
        setNextCursor(null); // prevent concurrent duplicate page loads
        try {
            const feed = await getFeed(cursor);
            if (sequence !== fetchSequence.current) return;
            setItems(previous => {
                const seen = new Set(previous.map(item => item.id));
                return [...previous, ...feed.items.filter(item => !seen.has(item.id))];
            });
            setNextCursor(feed.next_cursor);
        } catch {
            if (sequence === fetchSequence.current) setNextCursor(cursor);
        }
    }, [nextCursor]);

    const markRead = useCallback(async (id: string) => {
        const item = items.find(entry => entry.id === id);
        if (!item || item.read_at) return;
        setItems(previous => previous.map(entry => entry.id === id ? { ...entry, read_at: new Date().toISOString() } : entry));
        setUnread(previous => Math.max(0, previous - 1));
        try {
            await updateRead(`/notifications/${encodeURIComponent(id)}/read`);
        } catch { await refresh(); }
    }, [items, refresh]);

    const markAllRead = useCallback(async () => {
        setItems(previous => previous.map(item => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })));
        setUnread(0);
        try { await updateRead('/notifications/read-all'); }
        catch { await refresh(); }
    }, [refresh]);

    useEffect(() => {
        if (!memberId) return;
        setLoading(true);
        void refresh();
        let active = true;
        let client: Pusher | null = null;
        let failoverTimer: ReturnType<typeof setTimeout> | null = null;
        const key = realtime?.pusher?.key;
        const fallback = realtime?.reverb;
        const channelName = `private-users.${memberId}`;

        const connect = (PusherClient: typeof import('pusher-js').default, provider: 'pusher' | 'reverb') => {
            const settings = provider === 'pusher' ? realtime?.pusher : fallback;
            if (!active || !settings?.key) return;
            client?.disconnect();
            client = new PusherClient(settings.key, {
                cluster: settings.cluster ?? 'mt1',
                ...(provider === 'reverb' ? {
                    wsHost: settings.host,
                    wsPort: settings.port ?? 80,
                    wssPort: settings.port ?? 443,
                    forceTLS: settings.secure ?? true,
                    enabledTransports: ['ws', 'wss'] as ('ws' | 'wss')[],
                } : { forceTLS: true }),
                channelAuthorization: { endpoint: '/broadcasting/auth', transport: 'ajax' },
            });
            const connection = client;
            const channel = connection.subscribe(channelName);
            channel.bind('notifications.updated', () => { if (active) void refresh(); });
            connection.connection.bind('connected', () => {
                if (provider === 'pusher' && failoverTimer) clearTimeout(failoverTimer);
                if (active) void refresh();
            });
            if (provider === 'pusher') {
                const failover = () => {
                    if (!active || !fallback?.key || client !== connection) return;
                    if (failoverTimer) clearTimeout(failoverTimer);
                    connect(PusherClient, 'reverb');
                    void refresh(); // close the gap between the two connections
                };
                connection.connection.bind('unavailable', failover);
                connection.connection.bind('failed', failover);
                failoverTimer = setTimeout(() => {
                    if (connection.connection.state !== 'connected') failover();
                }, 10000);
            }
        };
        if (key || fallback?.key) {
            void import('pusher-js').then(({ default: PusherClient }) => {
                if (!active) return;
                if (key) connect(PusherClient, 'pusher');
                else connect(PusherClient, 'reverb');
            }).catch(() => { /* Database polling remains available without the WebSocket SDK. */ });
        }
        const interval = window.setInterval(() => { if (active) void refresh(); }, 45000);
        const onFocus = () => { if (active) void refresh(); };
        window.addEventListener('focus', onFocus);
        return () => {
            active = false;
            fetchSequence.current++;
            window.clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            if (failoverTimer) clearTimeout(failoverTimer);
            client?.disconnect();
        };
    }, [memberId, realtime?.pusher?.key, realtime?.pusher?.cluster, realtime?.reverb?.key,
        realtime?.reverb?.host, realtime?.reverb?.port, realtime?.reverb?.secure, refresh]);

    const value = useMemo(() => ({ items, unread, loading, error, hasMore: Boolean(nextCursor), refresh, loadMore, markRead, markAllRead }),
        [items, unread, loading, error, nextCursor, refresh, loadMore, markRead, markAllRead]);
    return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNotificationCenter(): NotificationContextValue {
    const value = useContext(Context);
    if (!value) throw new Error('NotificationCenterProvider is required within the member shell.');
    return value;
}

export type { Notification };
