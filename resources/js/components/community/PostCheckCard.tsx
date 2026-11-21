import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Bookmark, ImageIcon, MessageCircle, Pencil, RefreshCw, Repeat2, Share2, ShieldAlert, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';
import { ReactionGlyph } from '@/components/home/HomeEngagement';
import { PostContent } from '@/components/community/PostContent';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export type PostCheckPreview = {
    id: number;
    body: string;
    image_path: string | null;
    topic: string;
    status: 'pending_check' | 'check_error' | 'restricted' | 'pending_review';
    is_anonymous: boolean;
    check_reason: string | null;
    check_target: string | null;
    check_category: string | null;
    created_at: string;
};
export type PostCheckFeedData = {
    posts: PostCheckPreview[];
    restricted_count: number;
    violation_count: number;
    blocked_until: string | null;
    restriction_policy: { threshold: number; window_days: number; duration_days: number };
};

type Owner = { name: string; avatar_path?: string | null };

const failureMessage = (response: Response, value: { message?: string; errors?: Record<string, string[]> } | null) => {
    if (response.status === 419) return 'Your session expired. Please refresh and try again.';
    if (response.status === 429) return 'Too many attempts. Please try again later.';
    return (value?.errors && Object.values(value.errors)[0]?.[0]) || value?.message || 'Unable to submit the post. Please try again.';
};

function RestrictedPostDialog({ post, open, onClose, onSubmitted }: { post: PostCheckPreview; open: boolean; onClose: () => void; onSubmitted: () => void }) {
    const [body, setBody] = useState(post.body);
    const [image, setImage] = useState<File | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const hasAttachment = Boolean(post.image_path && !removeImage) || Boolean(image);
    const changedImage = removeImage || Boolean(image);
    const changedText = body.trim() !== post.body;
    const textFlagged = post.check_target === 'text' || post.check_target === 'both';
    const imageFlagged = post.check_target === 'image' || post.check_target === 'both';
    const canSubmit = !busy && body.length <= 5000 && (body.trim() !== '' || hasAttachment)
        && (changedText || changedImage) && (!textFlagged || changedText) && (!imageFlagged || changedImage);
    const chooseFile = (file: File | undefined) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            setError('Choose a JPG, PNG, or WebP image up to 5 MB.');
            return;
        }
        setImage(file);
        setRemoveImage(false);
        setError('');
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        setError('');
        try {
            const payload = new FormData();
            payload.append('body', body.trim());
            if (image) payload.append('image', image);
            if (removeImage) payload.append('remove_image', '1');
            const response = await fetch(`/posts/${post.id}/repost`, {
                method: 'POST', credentials: 'same-origin', body: payload,
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            });
            if (!response.ok) throw new Error(failureMessage(response, await response.json().catch(() => null)));
            onSubmitted();
            onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Unable to resubmit this post.');
        } finally { setBusy(false); }
    };
    return <Dialog open={open} onOpenChange={next => { if (!next && !busy) onClose(); }}>
        <DialogContent className="pm-post-check-dialog" aria-describedby={`pm-restricted-help-${post.id}`}>
            <DialogTitle>Edit restricted post</DialogTitle>
            <DialogDescription className="sr-only" id={`pm-restricted-help-${post.id}`}>Correct the flagged content, then submit it for another safety check.</DialogDescription>
            <form onSubmit={submit}>
                <div className="pm-post-check-edit-body">
                    <div className="pm-post-check-reason"><strong>Why it was restricted</strong><p>{post.check_reason || 'This post did not meet the community posting policy.'}</p></div>
                    <label className="pm-post-check-field" htmlFor={`pm-restricted-text-${post.id}`}>Post text</label>
                    <textarea id={`pm-restricted-text-${post.id}`} rows={4} maxLength={5000} value={body} onChange={event => setBody(event.target.value)} />
                    {post.image_path && <>
                        <span className="pm-post-check-field">Attachment</span>
                        <div className="pm-post-check-attachment"><div className="pm-post-check-attachment-name"><ImageIcon size={22}/><span>{image ? image.name : removeImage ? 'Image removed' : imageFlagged ? 'Image hidden' : 'Attached image'}</span></div>
                            <div className="pm-post-check-attachment-actions">
                                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Replace restricted image" onChange={event => chooseFile(event.target.files?.[0])}/>
                                <button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={() => input.current?.click()}><Repeat2 size={15}/> Replace image</button>
                                <button type="button" className="pm-button pm-button-outline pm-post-check-remove" disabled={busy} onClick={() => { setImage(null); setRemoveImage(true); }}><Trash2 size={15}/> Remove image</button>
                            </div>
                        </div>
                    </>}
                    {error && <p className="pm-post-action-error" role="alert">{error}</p>}
                    <p className="pm-post-check-edit-hint">Your changes will be checked before the post appears in the feed.</p>
                </div>
                <div className="pm-post-check-edit-footer"><button type="button" className="pm-button pm-button-outline" disabled={busy} onClick={onClose}>Cancel</button>
                    <div><button className="pm-button" type="submit" disabled={!canSubmit}>{busy ? 'Checking…' : 'Post again'}</button>
                        {!canSubmit && !busy && <small>{imageFlagged && !changedImage ? 'Remove or replace the image to continue.' : textFlagged && !changedText ? 'Edit the flagged text to continue.' : 'Edit before reposting'}</small>}
                    </div>
                </div>
            </form>
        </DialogContent>
    </Dialog>;
}

export function PostCheckCard({ post, owner, onRefresh, blockedUntil = null }: { post: PostCheckPreview; owner: Owner; onRefresh: () => void; blockedUntil?: string | null }) {
    const [editOpen, setEditOpen] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [error, setError] = useState('');
    const restricted = post.status === 'restricted';
    const contributionBlocked = Boolean(blockedUntil && new Date(blockedUntil).getTime() > Date.now());
    const checking = post.status === 'pending_check';
    const displayName = post.is_anonymous ? 'Anonymous member' : owner.name;
    const retry = async () => {
        setRetrying(true);
        setError('');
        try {
            const response = await fetch(`/posts/${post.id}/recheck`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '' },
            });
            if (!response.ok) throw new Error(failureMessage(response, await response.json().catch(() => null)));
            onRefresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to retry the check.'); }
        finally { setRetrying(false); }
    };
    return <article className={`pm-unified-post-card pm-post-check-card ${restricted ? 'is-restricted' : ''}`}>
        <header className="pm-card-author-header"><div className="pm-author-info-wrap">
            <Avatar name={displayName} src={post.is_anonymous ? null : owner.avatar_path} size={40} />
            <div className="pm-author-meta"><strong>{displayName}<span className="pm-post-check-time"> · {Date.now() - new Date(post.created_at).getTime() < 5 * 60 * 1000 ? 'Just now' : new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></strong>
                {restricted && <span className="pm-post-check-restricted-label"><ShieldAlert size={13}/>Restricted</span>}
            </div></div></header>
        <div className="pm-post-card-main pm-post-aligned-content">
            {restricted && post.check_target && ['text', 'both'].includes(post.check_target)
                ? <p className="pm-post-check-hidden-text">{post.check_category === 'harassment' ? '[Personal insult hidden]' : '[Restricted text hidden]'}</p>
                : <PostContent body={post.body} image={restricted ? null : post.image_path} className="pm-card-body"/>}
            {restricted && post.image_path && <div className="pm-post-check-image-hidden"><ImageIcon size={18}/> Image hidden</div>}
            {checking && <div className="pm-post-check-progress" role="status" aria-live="polite"><strong>Checking your post...</strong><p>Your post will appear in the feed once it passes the check.</p><div className="pm-post-check-track"><div/></div></div>}
            {restricted && <div className="pm-post-check-reason"><strong>Why it was restricted</strong><p>{post.check_reason || 'This post did not meet the community posting policy.'}</p></div>}
            {post.status === 'pending_review' && <div className="pm-post-check-progress" role="status"><strong>Waiting for admin review</strong><p>Your post is awaiting an administrator review before publication.</p></div>}
            {post.status === 'check_error' && <div className="pm-post-check-error" role="alert"><AlertCircle size={18}/><span>We couldn't check your post. It remains private.</span><button type="button" disabled={retrying || contributionBlocked} onClick={() => void retry()}><RefreshCw size={15}/>{retrying ? 'Retrying…' : 'Retry'}</button></div>}
            {error && <p className="pm-post-action-error" role="alert">{error}</p>}
        </div>
        {restricted ? <div className="pm-post-check-restricted-actions"><button type="button" className="pm-button pm-button-outline" disabled={contributionBlocked} onClick={() => setEditOpen(true)}><Pencil size={16}/> Edit post</button><button type="button" className="pm-button pm-post-check-post-again" disabled>Post again</button><small>{contributionBlocked ? 'Reposting is available when your restriction ends.' : 'Edit before reposting'}</small></div>
            : <footer className="pm-post-check-quiet-actions" aria-label="Engagement is available after publication"><span><ReactionGlyph type="love" size={18}/> Love</span><span><MessageCircle size={18}/> Comments</span><span><Share2 size={18}/> Share</span><span><Bookmark size={18}/> Save</span></footer>}
        {editOpen && <RestrictedPostDialog post={post} open={editOpen} onClose={() => setEditOpen(false)} onSubmitted={onRefresh}/>}
    </article>;
}
