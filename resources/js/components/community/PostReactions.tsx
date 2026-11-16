import { Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reactionOptions, type ReactionType } from '@/components/home/HomeEngagement';

export type ReactionCounts = Partial<Record<ReactionType, number>>;

type Reactor = {
    id: number;
    type: ReactionType;
    name: string;
    avatar_url: string | null;
    profile_url: string | null;
};
type ReactionPage = { total: number; counts: ReactionCounts; data: Reactor[]; next_cursor: number | null };
type Tab = ReactionType | 'all';

function ReactionMark({ type, size = 18 }: { type: ReactionType; size?: number }) {
    const option = reactionOptions.find(item => item.type === type);
    if (!option) return null;
    const Icon = option.Icon;
    return <span className={`pm-post-reaction-icon is-${type}`} title={option.label}
        aria-label={`${option.label} reaction`}><Icon size={size} aria-hidden={true}/></span>;
}

/** Compact summary; the full roster is fetched ONLY on click, never for every feed post. */
export function PostReactionSummary({ postId, total, counts, onRefresh }: {
    postId: number;
    total: number;
    counts: ReactionCounts;
    onRefresh: (total: number, counts: ReactionCounts) => void;
}) {
    const [open, setOpen] = useState(false);
    const displayed = reactionOptions.filter(option => (counts[option.type] ?? 0) > 0)
        .sort((a, b) => (counts[b.type] ?? 0) - (counts[a.type] ?? 0))
        .slice(0, 3);

    if (total < 1) return null;

    return <>
        <button type="button" className="pm-post-reaction-summary" onClick={() => setOpen(true)}
            aria-label={`View ${total} ${total === 1 ? 'reaction' : 'reactions'} and members`}>
            <span className="pm-post-reaction-stack" aria-hidden="true">
                {displayed.map(({ type }) => <ReactionMark key={type} type={type}/>)}
            </span>
            <span className="pm-post-reaction-total">{total}</span>
        </button>
        {open && <PostReactionDialog postId={postId} initialTotal={total} initialCounts={counts}
            onClose={() => setOpen(false)} onRefresh={onRefresh}/>}
    </>;
}

/** Real users, grouped tabs and stable cursor pagination. No demo identities or eager avatar queries. */
function PostReactionDialog({ postId, initialTotal, initialCounts, onClose, onRefresh }: {
    postId: number;
    initialTotal: number;
    initialCounts: ReactionCounts;
    onClose: () => void;
    onRefresh: (total: number, counts: ReactionCounts) => void;
}) {
    const [tab, setTab] = useState<Tab>('all');
    const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
    const [total, setTotal] = useState(initialTotal);
    const [users, setUsers] = useState<Reactor[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const controller = useRef<AbortController | null>(null);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;
    const pending = useRef(false);

    const load = useCallback(async (filter: Tab, after: number | null = null) => {
        if (pending.current && after !== null) return;
        controller.current?.abort();
        const request = new AbortController();
        controller.current = request;
        pending.current = true;
        setLoading(true);
        setError('');
        const query = new URLSearchParams();
        if (filter !== 'all') query.set('type', filter);
        if (after !== null) query.set('after', String(after));
        try {
            const response = await fetch(`/posts/${postId}/reactions/users?${query}`, {
                credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, signal: request.signal,
            });
            if (!response.ok) {
                throw new Error(response.status === 429 ? 'Too many requests. Please try again shortly.'
                    : response.status === 404 ? 'This post is no longer available.'
                        : 'Unable to load reactions. Please try again.');
            }
            const result = await response.json() as ReactionPage;
            if (request.signal.aborted) return;
            setTotal(result.total);
            setCounts(result.counts);
            setUsers(previous => after === null ? result.data : [...previous, ...result.data]);
            setNextCursor(result.next_cursor);
            onRefreshRef.current(result.total, result.counts);
        } catch (failure) {
            if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load reactions.');
        } finally {
            if (!request.signal.aborted && controller.current === request) {
                pending.current = false;
                setLoading(false);
            }
        }
    }, [postId]);

    useEffect(() => {
        void load(tab);
        return () => { controller.current?.abort(); pending.current = false; };
    }, [tab, load]);

    return <Dialog open onOpenChange={value => { if (!value) onClose(); }}>
        <DialogContent className="pm-post-reactions-dialog" aria-describedby="pm-post-reactions-description">
            <DialogHeader><DialogTitle>Reactions</DialogTitle>
                <DialogDescription id="pm-post-reactions-description" className="sr-only">People who reacted to this post, grouped by reaction type.</DialogDescription>
            </DialogHeader>
            <div className="pm-post-reactions-tabs" role="tablist" aria-label="Filter reactions"
                onKeyDown={event => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
                    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
                    if (current < 0) return;
                    event.preventDefault();
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                    tabs[next]?.focus();
                    tabs[next]?.click();
                }}>
                <button type="button" role="tab" aria-selected={tab === 'all'} tabIndex={tab === 'all' ? 0 : -1}
                    className={tab === 'all' ? 'is-selected' : ''} onClick={() => { if (tab !== 'all') { setUsers([]); setTab('all'); } }}>All {total}</button>
                {reactionOptions.filter(option => (counts[option.type] ?? 0) > 0).map(({ type, label }) =>
                    <button key={type} type="button" role="tab" aria-label={`${label} ${counts[type]}`} aria-selected={tab === type} tabIndex={tab === type ? 0 : -1}
                        className={tab === type ? 'is-selected' : ''} onClick={() => { if (tab !== type) { setUsers([]); setTab(type); } }}>
                        <ReactionMark type={type} size={17}/>
                        <span>{counts[type]}</span>
                    </button>)}
            </div>
            <div className="pm-post-reactions-roster" role="tabpanel" aria-label={tab === 'all' ? 'All reactions' : `${tab} reactions`}
                onScroll={event => {
                    const target = event.currentTarget;
                    if (!loading && nextCursor !== null && target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
                        void load(tab, nextCursor);
                    }
                }}>
                {users.map(user => <div key={user.id} className="pm-post-reactions-member">
                    <Avatar name={user.name} size={36} src={user.avatar_url} disableDemoFallback/>
                    <div className="pm-post-reactions-name">
                        {user.profile_url ? <Link href={user.profile_url}>{user.name}</Link> : <span>{user.name}</span>}
                    </div>
                    <ReactionMark type={user.type} size={19}/>
                </div>)}
                {loading && <p role="status" className="pm-post-reactions-feedback">Loading reactions…</p>}
                {!loading && !error && users.length === 0 && <p className="pm-post-reactions-feedback">No reactions to display.</p>}
                {error && <div className="pm-post-reactions-feedback" role="alert">{error} <button type="button" onClick={() => void load(tab, users.length ? nextCursor : null)}>Retry</button></div>}
                {!loading && !error && nextCursor !== null && <button type="button" className="pm-post-reactions-more"
                    onClick={() => void load(tab, nextCursor)}>Load more reactions</button>}
            </div>
        </DialogContent>
    </Dialog>;
}
