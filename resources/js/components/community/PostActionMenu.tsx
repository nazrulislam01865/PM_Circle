import { useIsMobile } from '@/hooks/use-mobile';
import { router } from '@inertiajs/react';
import type { PostSecondaryActions } from './usePostSecondaryActions';
import { Bookmark, Share2, ArrowRight, Ellipsis, EyeOff, Flag, Link2, Pencil, BellOff, Bell, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PostComposerDialog } from '@/components/community/PostComposerDialog';
import type { EditablePost } from '@/components/community/PostComposerDialog';

const reasons = [
    { value: 'spam', label: 'Spam or scam' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate', label: 'Hate speech' },
    { value: 'privacy', label: 'Sharing private information' },
    { value: 'other', label: 'Other' },
] as const;

type Props = {
    post: EditablePost;
    isOwner: boolean;
    muted?: boolean;
    hidden?: boolean;
    canInteract?: boolean;
    onJoin?: (action: string) => void;
    onRemoved?: () => void;
    onUpdated?: (updated: { body: string; image_path: string | null; status?: string }) => void;
    onMuteChange?: (muted: boolean) => void;
    onHiddenChange?: (hidden: boolean) => void;
    authorName?: string;
    secondary?: PostSecondaryActions;
    readHref?: string;
    mobileOnly?: boolean;
};

export function PostActionMenu({ post, isOwner, muted = false, hidden = false, canInteract = true, onJoin, onRemoved, onUpdated, onMuteChange, onHiddenChange, authorName = 'a community member', secondary, readHref, mobileOnly = false }: Props) {
    const isMobile = useIsMobile();
    const [reportOpen, setReportOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [reason, setReason] = useState<string>('spam');
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [localMuted, setLocalMuted] = useState(muted);
    const action = async (path: string, method: 'POST' | 'DELETE', payload?: object) => {
        setBusy(true); setError(''); setNotice('');
        try {
            const response = await fetch(path ? `/posts/${post.id}/${path}` : `/posts/${post.id}`, {
                method, credentials: 'same-origin',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
                ...(payload ? { body: JSON.stringify(payload) } : {}),
            });
            if (!response.ok) {
                const data = await response.json().catch(() => null) as { errors?: Record<string, string[]>; message?: string } | null;
                throw new Error(data?.errors ? Object.values(data.errors)[0]?.[0] : response.status === 419 ? 'Session expired. Refresh and try again.' : data?.message ?? 'Could not complete the action.');
            }
            return await response.json();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not complete the action.');
            return null;
        } finally { setBusy(false); }
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`); setNotice('Link copied.'); }
        catch { setError('Could not copy the link. Please use your browser to copy the post URL.'); }
    };
    const checkAccess = (verb: string, callback: () => void) => {
        if (!canInteract) onJoin?.(verb);
        else callback();
    };
    if (mobileOnly && !isMobile) return null;
    return <div data-feed-pin={Boolean(reportOpen || deleteOpen || editOpen || busy) || undefined} className={`pm-post-actions-root${mobileOnly ? ' pm-post-mobile-menu' : ''}`}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><button type="button" className="pm-post-menu-trigger" aria-label={`More options for post by ${authorName}`}><Ellipsis size={21} aria-hidden="true"/></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={5} className="pm-post-menu-content">
                {isMobile && secondary && <>
                    <DropdownMenuItem className="pm-post-menu-item pm-post-mobile-item" onSelect={() => { void secondary.share(); }}><Share2 size={17}/>{secondary.copied ? 'Copied' : 'Share'}</DropdownMenuItem>
                    <DropdownMenuItem className="pm-post-menu-item pm-post-mobile-item" disabled={secondary.saveBusy} onSelect={() => { void secondary.toggleSave(); }}><Bookmark size={17}/>{secondary.saved ? 'Saved' : 'Save'}</DropdownMenuItem>
                    {readHref && <DropdownMenuItem className="pm-post-menu-item pm-post-mobile-item" onSelect={() => router.visit(readHref)}><ArrowRight size={17}/>Read discussion</DropdownMenuItem>}
                    {!mobileOnly && <DropdownMenuSeparator className="pm-post-menu-separator pm-post-mobile-item"/>}
                </>}
                {!mobileOnly && <>
                {isOwner && <DropdownMenuItem className="pm-post-menu-item" disabled={busy} onSelect={() => setEditOpen(true)}><Pencil size={17}/>Edit post</DropdownMenuItem>}
                <DropdownMenuItem className="pm-post-menu-item" onSelect={() => { void copyLink(); }}><Link2 size={17}/>Copy link</DropdownMenuItem>
                {isOwner ? <>
                    {hidden && <DropdownMenuItem className="pm-post-menu-item" disabled={busy}
                        onSelect={() => { void action('hide', 'DELETE').then(result => { if (result) onHiddenChange?.(false); }); }}>
                        <EyeOff size={17}/>Unhide post
                    </DropdownMenuItem>}
                    <DropdownMenuItem className="pm-post-menu-item" disabled={busy} onSelect={() => { void action('mute', 'POST').then(result => { if (result) { setLocalMuted(result.muted); onMuteChange?.(result.muted); } }); }}>
                        {localMuted ? <Bell size={17}/> : <BellOff size={17}/>} {localMuted ? 'Turn on notifications' : 'Turn off notifications'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="pm-post-menu-separator" />
                    <DropdownMenuItem className="pm-post-menu-item is-danger" disabled={busy} onSelect={() => setDeleteOpen(true)}><Trash2 size={17}/>Delete post</DropdownMenuItem>
                </> : <>
                    <DropdownMenuItem className="pm-post-menu-item" disabled={busy} onSelect={() => checkAccess(hidden ? 'unhide a post' : 'hide a post', () => {
                        void action('hide', hidden ? 'DELETE' : 'POST').then(result => {
                            if (result) { if (onHiddenChange) onHiddenChange(!hidden); else onRemoved?.(); }
                        });
                    })}><EyeOff size={17}/>{hidden ? 'Unhide post' : 'Hide post'}</DropdownMenuItem>
                    <DropdownMenuSeparator className="pm-post-menu-separator" />
                    <DropdownMenuItem className="pm-post-menu-item is-danger" disabled={busy} onSelect={() => checkAccess('report a post', () => { setError(''); setReportOpen(true); })}><Flag size={17}/>Report post</DropdownMenuItem>
                </>}
                </>}
            </DropdownMenuContent>
        </DropdownMenu>
        {notice && <span className="pm-post-action-notice" role="status">{notice}</span>}
        {error && !reportOpen && !deleteOpen && <p className="pm-post-action-error" role="alert">{error}</p>}
        {editOpen && <PostComposerDialog open={editOpen} onClose={() => setEditOpen(false)} editPost={post} onUpdated={onUpdated}/>}
        <Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent className="pm-post-report-dialog" aria-describedby="pm-report-description">
            <DialogTitle className="pm-post-report-title">Report post</DialogTitle>
            <form onSubmit={event => { event.preventDefault(); void action('report', 'POST', { reason, details }).then(result => { if (result) { setReportOpen(false); setDetails(''); if (hidden) setNotice('Report submitted.'); else if (onHiddenChange) onHiddenChange(true); else onRemoved?.(); } }); }}>
                <div className="pm-post-report-content"><h3>Why are you reporting this post?</h3><p id="pm-report-description">Post by {authorName}</p>
                    <div className="pm-post-report-reasons" role="radiogroup" aria-label="Report reason">{reasons.map(item => <label className="pm-post-report-choice" key={item.value}><input type="radio" name={`reason-${post.id}`} value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)}/>{item.label}</label>)}</div>
                    <label className="pm-post-report-detail-label" htmlFor={`pm-report-details-${post.id}`}>Additional details (optional)</label>
                    <textarea id={`pm-report-details-${post.id}`} className="pm-post-report-detail" placeholder="Add any context that may help us review this report" maxLength={1000} value={details} onChange={event => setDetails(event.target.value)}/>
                    {error && <p className="pm-post-action-error" role="alert">{error}</p>}
                </div>
                <div className="pm-post-report-footer"><button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={() => setReportOpen(false)}>Cancel</button><button type="submit" className="pm-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'}</button></div>
            </form>
        </DialogContent></Dialog>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent className="pm-post-delete-dialog" aria-describedby="pm-delete-explanation"><DialogTitle className="pm-post-report-title">Delete post?</DialogTitle>
            <div className="pm-post-report-content"><p id="pm-delete-explanation">This post will be removed from the community feed. This action cannot be undone from your account.</p>{error && <p className="pm-post-action-error" role="alert">{error}</p>}</div>
            <div className="pm-post-report-footer"><button type="button" disabled={busy} className="pm-button pm-button-outline" onClick={() => setDeleteOpen(false)}>Cancel</button><button type="button" className="pm-button" disabled={busy} onClick={() => { void action('', 'DELETE').then(result => { if (result) { setDeleteOpen(false); onRemoved?.(); } }); }}>{busy ? 'Deleting…' : 'Delete post'}</button></div>
        </DialogContent></Dialog>
    </div>;
}
