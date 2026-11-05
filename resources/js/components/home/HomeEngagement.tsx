import { Link, router } from '@inertiajs/react';
import { Angry, CircleAlert, Frown, HandHeart, Heart, Laugh, MessageCircle, Share2, ThumbsUp } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type ReactionType = 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry';
export type RequestToJoin = (action: string) => void;

const reactions: { type: ReactionType; label: string; Icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[] = [
    { type: 'like', label: 'Like', Icon: ThumbsUp },
    { type: 'love', label: 'Love', Icon: Heart },
    { type: 'care', label: 'Care', Icon: HandHeart },
    { type: 'haha', label: 'Haha', Icon: Laugh },
    { type: 'wow', label: 'Wow', Icon: CircleAlert },
    { type: 'sad', label: 'Sad', Icon: Frown },
    { type: 'angry', label: 'Angry', Icon: Angry },
];

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

export function ReactionPicker({ endpoint, initial, total, canInteract, onJoin, label = 'post' }: {
    endpoint: string; initial?: ReactionType | null; total?: number;
    canInteract: boolean; onJoin: RequestToJoin; label?: string;
}) {
    const [active, setActive] = useState<ReactionType | null>(initial ?? null);
    const [count, setCount] = useState(total ?? 0);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const root = useRef<HTMLDivElement>(null);
    const touch = useRef(false);

    useEffect(() => { setActive(initial ?? null); setCount(total ?? 0); }, [initial, total, endpoint]);
    useEffect(() => {
        if (!open) return;
        const closeOutside = (event: PointerEvent) => {
            if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [open]);

    const react = async (type: ReactionType) => {
        if (!canInteract) { onJoin(`react to this ${label}`); setOpen(false); return; }
        if (busy) return;
        setBusy(true);
        setError('');
        const remove = active === type;
        try {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const response = await fetch(endpoint, {
                method: remove ? 'DELETE' : 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': token,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                ...(!remove ? { body: JSON.stringify({ type }) } : {}),
            });
            if (!response.ok) throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.' : 'Unable to save your reaction. Please try again.');
            const result: { reaction: ReactionType | null; count: number } = await response.json();
            setActive(result.reaction);
            setCount(result.count);
            setOpen(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save your reaction.');
        } finally { setBusy(false); }
    };
    const chosen = reactions.find(reaction => reaction.type === active);
    const MainIcon = chosen?.Icon ?? ThumbsUp;
    return <div className="pm-home-reaction-root" ref={root} data-open={open ? 'true' : 'false'}>
        <button type="button" className={`pm-home-action pm-home-reaction-main${active ? ` is-${active}` : ''}`}
            disabled={busy} aria-label={chosen ? `${chosen.label} reaction. Select to remove or choose a different reaction` : `Like this ${label}`}
            aria-pressed={Boolean(active)} aria-haspopup="true" aria-expanded={open}
            onPointerDown={event => { touch.current = event.pointerType === 'touch'; }}
            onClick={() => { if (touch.current) { setOpen(value => !value); touch.current = false; } else void react(active ?? 'like'); }}>
            <MainIcon size={19} aria-hidden={true}/>
            <span>{chosen?.label ?? 'Like'}</span>
            {count > 0 && <span className="pm-home-reaction-count">{count}</span>}
        </button>
        <div className="pm-home-reaction-options" role="group" aria-label={`Choose reaction to ${label}`}>
            {reactions.map(({ type, label: name, Icon }) => <button key={type} type="button"
                title={name} className={`pm-home-reaction-choice is-${type}`} disabled={busy}
                aria-label={`${name} reaction`} aria-pressed={active === type}
                onClick={() => { void react(type); }}><Icon size={23} aria-hidden={true}/></button>)}
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

export function HomeShareAction({ href, canInteract, onJoin }: {
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
    return <span className="pm-home-share-wrap"><button type="button" className="pm-home-action" onClick={() => { void share(); }}>
        <Share2 size={19} aria-hidden="true"/>{copied ? 'Copied' : 'Share'}
    </button>{error && <span className="pm-home-reaction-error" role="alert">{error}</span>}</span>;
}
