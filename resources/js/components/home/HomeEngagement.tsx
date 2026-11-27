import { Link, router, usePage } from '@inertiajs/react';
import { Angry, CircleAlert, Frown, HandHeart, Heart, Laugh, MessageCircle, Share2, Smile, ThumbsUp } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry' | (string & {});
export type RequestToJoin = (action: string) => void;

export type ReactionOption = { type: ReactionType; label: string; Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; active: boolean };

export const reactionOptions: ReactionOption[] = [
    { type: 'like', active: true, label: 'Like', Icon: ThumbsUp },
    { type: 'love', active: true, label: 'Love', Icon: Heart },
    { type: 'care', active: true, label: 'Care', Icon: HandHeart },
    { type: 'haha', active: true, label: 'Haha', Icon: Laugh },
    { type: 'wow', active: true, label: 'Wow', Icon: CircleAlert },
    { type: 'sad', active: true, label: 'Sad', Icon: Frown },
    { type: 'angry', active: true, label: 'Angry', Icon: Angry },
];

export type ReactionDefinition = { type: ReactionType; label: string; builtin: boolean; active: boolean; url: string | null };

/** One cached server catalog drives every post, comment, and scenario picker. */
export function useReactionOptions(includeInactive = false): ReactionOption[] {
    const page = usePage();
    const definitions = page.props.reactionDefinitions as ReactionDefinition[] | undefined;
    if (!definitions?.length) return reactionOptions;
    return definitions.filter(item => includeInactive || item.active).map(item => ({
        type: item.type, label: item.label, active: item.active,
        Icon: reactionOptions.find(defaultOption => defaultOption.type === item.type)?.Icon ?? Smile,
    }));
}

/** Admin-uploaded image when available; original Lucide icon is the permanent fallback. */
export function ReactionGlyph({ type, size = 20, urlOverride, prototypeLikeIcon = false }: {
    type: ReactionType;
    size?: number;
    urlOverride?: string | null;
    prototypeLikeIcon?: boolean;
}) {
    const page = usePage();
    const icons = page.props.reactionIcons as Partial<Record<ReactionType, string>> | undefined;
    const url = urlOverride === undefined ? icons?.[type] : urlOverride;
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const option = reactionOptions.find(item => item.type === type);
    const Icon = prototypeLikeIcon && type === 'like' ? Heart : option?.Icon ?? Smile;

    return url && failedUrl !== url
        ? <img src={url} width={size} height={size} className="pm-reaction-image" alt="" draggable={false}
            decoding="async" onError={() => setFailedUrl(url)} aria-hidden="true" />
        : <Icon size={size} aria-hidden={true}/>;
}

export function JoinCommunityDialog({ action, onClose, hasAccount }: {
    action: string | null; onClose: () => void; hasAccount: boolean;
}) {
    const label = action ?? 'interact';
    return <Dialog open={action !== null} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent className="pm-home-join-dialog" aria-describedby="pm-join-dialog-description">
            <DialogHeader>
                <DialogTitle>{hasAccount ? 'Finish joining PM Circle' : 'Join the PM Circle community'}</DialogTitle>
                <DialogDescription id="pm-join-dialog-description">
                    {hasAccount
                        ? `Complete your account setup to ${label} and connect with other project professionals.`
                        : `To ${label}, join our professional community. It's free to get started.`}
                </DialogDescription>
            </DialogHeader>
            <div className="pm-home-join-dialog-actions">
                <Link href={hasAccount ? '/dashboard' : '/register'} className="pm-button">{hasAccount ? 'Complete setup' : 'Join the community'}</Link>
                {!hasAccount && <Link href="/login" className="pm-button pm-button-outline">Log in</Link>}
            </div>
        </DialogContent>
    </Dialog>;
}

export function ReactionPicker({ endpoint, initial, total, version, canInteract, onJoin, label = 'post', onChanged, showCount = true, buttonLabel, prototypeIcon = false }: {
    endpoint: string; initial?: ReactionType | null; total?: number; version?: number | null;
    canInteract: boolean; onJoin: RequestToJoin; label?: string;
    onChanged?: (reaction: ReactionType | null, count: number, breakdown?: Record<string, number>, version?: number | null) => void;
    showCount?: boolean; buttonLabel?: string; prototypeIcon?: boolean;
}) {
    const [active, setActive] = useState<ReactionType | null>(initial ?? null);
    const [count, setCount] = useState(total ?? 0);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const options = useReactionOptions();
    const allOptions = useReactionOptions(true);
    const root = useRef<HTMLDivElement>(null);
    const touch = useRef(false);

    const confirmed = useRef({ reaction: initial ?? null, count: total ?? 0, version: version ?? null });
    const desired = useRef<ReactionType | null>(initial ?? null);
    const running = useRef(false);
    const sequence = useRef(0);
    const changed = useRef(onChanged);
    changed.current = onChanged;
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => {
        const currentVersion = confirmed.current.version;
        if (version != null && currentVersion != null && version < currentVersion) return;
        if (running.current && (version == null || (currentVersion != null && version <= currentVersion))) return;
        confirmed.current = { reaction: initial ?? null, count: total ?? 0, version: version ?? null };
        if (!running.current) {
            desired.current = initial ?? null;
            setActive(initial ?? null); setCount(total ?? 0);
        } else {
            setCount(Math.max(0, (total ?? 0) + Number(desired.current !== null) - Number(initial != null)));
        }
    }, [initial, total, endpoint, version]);
    useEffect(() => {
        if (!open) return;
        const closeOutside = (event: PointerEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [open]);

    const renderIntent = () => {
        const base = confirmed.current;
        if (!alive.current) return;
        setActive(desired.current);
        setCount(Math.max(0, base.count + Number(desired.current !== null) - Number(base.reaction !== null)));
    };
    const react = async (type: ReactionType) => {
        if (!canInteract) { onJoin(`react to this ${label}`); setOpen(false); return; }
        desired.current = desired.current === type ? null : type;
        sequence.current++;
        renderIntent();
        setError('');
        if (running.current) return;
        running.current = true;
        setBusy(true);
        try {
            // One request per target; clicks received while it is running coalesce to the last intent.
            while (alive.current) {
                const intent = desired.current;
                const localSeq = sequence.current;
                const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
                const send = () => fetch(endpoint, {
                    method: intent === null ? 'DELETE' : 'POST', credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
                    ...(intent === null ? {} : { body: JSON.stringify({ type: intent }) }),
                });
                try {
                    // A network failure is ambiguous. Retry the same desired state, never a toggle.
                    const response = await send().catch(() => send());
                    if (!response.ok) throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.' : 'Unable to save your reaction. Please try again.');
                    const result: { reaction: ReactionType | null; count: number; breakdown?: Record<string, number>; version?: number | null } = await response.json();
                    if (!alive.current) return;
                    if (result.version == null || confirmed.current.version == null || result.version >= confirmed.current.version) {
                        confirmed.current = { reaction: result.reaction, count: result.count, version: result.version ?? null };
                        changed.current?.(result.reaction, result.count, result.breakdown, result.version);
                    }
                    if (localSeq === sequence.current) {
                        desired.current = confirmed.current.reaction;
                        renderIntent(); setOpen(false); break;
                    }
                    renderIntent();
                    if (desired.current === confirmed.current.reaction) break;
                } catch (reason) {
                    if (!alive.current) return;
                    if (localSeq === sequence.current) {
                        desired.current = confirmed.current.reaction;
                        renderIntent();
                        setError(reason instanceof Error ? reason.message : 'Unable to save your reaction.');
                        break;
                    }
                    // A newer intent supersedes the failed one; send it even if it equals the last confirmation.
                    renderIntent();
                }
            }
        } finally { running.current = false; if (alive.current) setBusy(false); }
    };
    const chosen = allOptions.find(reaction => reaction.type === active);
    const selectedType = active ?? 'like';
    const archivedSelection = active !== null && !options.some(option => option.type === active);
    return <div data-feed-pin={busy || open || undefined} className="pm-home-reaction-root" ref={root} data-open={open ? 'true' : 'false'}>
        <button type="button" className={`pm-home-action pm-home-reaction-main${active ? ` is-${active}` : ''}`}
            aria-busy={busy} aria-label={chosen ? `${chosen.label} reaction. Select to remove or choose a different reaction` : `Like this ${label}`}
            aria-pressed={Boolean(active)} aria-haspopup="true" aria-expanded={open}
            onPointerDown={event => { touch.current = event.pointerType === 'touch'; }}
            onClick={() => { if (touch.current) { setOpen(value => !value); touch.current = false; } else void react(desired.current ?? 'like'); }}>
            <ReactionGlyph type={selectedType} size={19} prototypeLikeIcon={prototypeIcon && !active}/>
            <span className="pm-home-reaction-label">{chosen?.label ?? buttonLabel ?? 'Like'}</span>
            {showCount && count > 0 && <span className="pm-home-reaction-count">{count}</span>}
        </button>
        <div className="pm-home-reaction-options" data-many={options.length > 7 || archivedSelection ? 'true' : undefined} role="group" aria-label={`Choose reaction to ${label}`}>
            {options.map(({ type, label: name }) => <button key={type} type="button"
                title={name} className={`pm-home-reaction-choice is-${type}`}
                aria-label={`${name} reaction`} aria-pressed={active === type}
                onClick={() => { void react(type); }}><ReactionGlyph type={type} size={23}/></button>)}
            {archivedSelection && <button type="button" className="pm-home-reaction-remove-archived"
                onClick={() => { if (active) void react(active); }}>Remove previous reaction</button>}
        </div>
        {error && <span className="pm-home-reaction-error" role="alert">{error}</span>}
    </div>;
}

export function HomeCommentAction({ label, count, href, canInteract, onJoin }: {
    label: string; count?: number; href: string; canInteract: boolean; onJoin: RequestToJoin;
}) {
    return <button type="button" className="pm-home-action" onClick={() => {
        if (!canInteract) onJoin(label.toLowerCase().includes('reply') ? 'reply to a discussion' : 'comment on a discussion');
        else if (new URL(href, window.location.origin).pathname === window.location.pathname && href.includes('#')) {
            const panel = document.getElementById('post-comments');
            panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            panel?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
        } else router.visit(href);
    }}><MessageCircle size={19} aria-hidden="true"/>{count === undefined ? label : `${count} ${label}`}</button>;
}

export function useHomeShare({ href, canInteract, onJoin }: {
    href: string; canInteract: boolean; onJoin: RequestToJoin;
}) {
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const share = async () => {
        if (!canInteract) { onJoin('share community content'); return; }
        try {
            await navigator.clipboard.writeText(new URL(href, window.location.origin).href);
            setCopied(true);
            setError('');
        } catch {
            setError('Copy unavailable. Please copy the page URL from your browser.');
        }
    };
    return { share, copied, error };
}

export function HomeShareAction(props: { href: string; canInteract: boolean; onJoin: RequestToJoin }) {
    const { share, copied, error } = useHomeShare(props);
    return <span className="pm-home-share-wrap"><button type="button" className="pm-home-action" onClick={() => { void share(); }}>
        <Share2 size={19} aria-hidden="true"/>{copied ? 'Copied' : 'Share'}
    </button>{error && <span className="pm-home-reaction-error" role="alert">{error}</span>}</span>;
}
