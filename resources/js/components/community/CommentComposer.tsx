import { ImagePlus, Send, Smile, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import type { RequestToJoin } from '@/components/home/HomeEngagement';

export type SavedComment = {
    id: number;
    body: string;
    media_url?: string | null;
    created_at: string;
    likes_count: number;
    viewer_liked: boolean;
    viewer_reaction?: import('@/components/home/HomeEngagement').ReactionType | null;
    author: { name: string; avatar_path?: string | null };
    replies: SavedComment[];
    replies_count?: number;
};

const emojis = ['🙂', '😊', '❤️', '👍', '👏', '🙌', '🎉', '🤝', '💡', '🚀', '😮', '😢'];
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxFileBytes = 5 * 1024 * 1024;
const commentDrafts = new Map<number, string>();

/** Shared post/discussion comment editor. Scenario replies provide a text-submit callback; post comments use their existing media endpoint. */
export function CommentComposer({ postId, parentId = null, avatarName, avatarSrc, canInteract, onJoin, onCreated, onSubmitText, onCancel, replyToName, compact = false, allowMedia = true, maxLength = 3000 }: {
    postId?: number;
    parentId?: number | null;
    avatarName: string;
    avatarSrc?: string | null;
    canInteract: boolean;
    onJoin: RequestToJoin;
    onCreated?: (comment: SavedComment) => void;
    onSubmitText?: (body: string) => Promise<void>;
    allowMedia?: boolean;
    maxLength?: number;
    onCancel?: () => void;
    replyToName?: string;
    compact?: boolean;
}) {
    const [body, setBody] = useState(() => compact || postId === undefined ? '' : (commentDrafts.get(postId) ?? ''));
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reviewNotice, setReviewNotice] = useState('');
    const [pendingReview, setPendingReview] = useState<{ id: number; submittedBody: string } | null>(null);
    const [failedComment, setFailedComment] = useState<number | null>(null);
    const onCreatedRef = useRef(onCreated);
    useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
    const photoInput = useRef<HTMLInputElement>(null);
    const editor = useRef<HTMLTextAreaElement>(null);
    const isReply = parentId !== null;
    const trimmedLength = Array.from(body.trim()).length;
    const valid = trimmedLength <= maxLength && (trimmedLength >= 2 || (allowMedia && Boolean(file) && trimmedLength === 0));

    useEffect(() => {
        if (!file) { setPreview(null); return; }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => { if (isReply) editor.current?.focus(); }, [isReply]);

    useEffect(() => {
        if (!pendingReview || postId === undefined) return;
        let live = true;
        let settled = false;
        const poll = async () => {
            if (settled) return;
            try {
                const response = await fetch(`/posts/${postId}/comments/${pendingReview.id}/check-status`, {
                    credentials: 'same-origin', headers: { Accept: 'application/json' },
                });
                if (!response.ok || !live || settled) return;
                const result = await response.json() as {
                    status: string; reason?: string | null; comment?: SavedComment | null;
                };
                if (!live || settled) return;
                if (result.status === 'approved' && result.comment) {
                    settled = true;
                    onCreatedRef.current?.(result.comment);
                    setPendingReview(null); setReviewNotice(''); setFailedComment(null);
                } else if (result.status === 'restricted') {
                    settled = true;
                    setBody(pendingReview.submittedBody);
                    setError(result.reason || 'Your comment did not meet the community policy. Edit and submit again.');
                    setReviewNotice(''); setPendingReview(null);
                } else if (result.status === 'check_error') {
                    settled = true;
                    setFailedComment(pendingReview.id);
                    setReviewNotice('Your comment could not be checked. It has not been published.');
                    setPendingReview(null);
                } else if (result.status === 'pending_review') {
                    settled = true;
                    setReviewNotice('Your comment is awaiting an administrator review.');
                    setPendingReview(null);
                }
            } catch { /* The next poll retries; never expose unchecked comments. */ }
        };
        void poll();
        const timer = window.setInterval(() => { void poll(); }, 6000);
        return () => { live = false; window.clearInterval(timer); };
    }, [pendingReview, postId]);

    const retryFailedReview = async () => {
        if (!failedComment || postId === undefined) return;
        setError('');
        const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        try {
            const response = await fetch(`/posts/${postId}/comments/${failedComment}/recheck`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-CSRF-TOKEN': token },
            });
            if (!response.ok) throw new Error('Unable to retry comment checking.');
            setPendingReview({ id: failedComment, submittedBody: body });
            setFailedComment(null);
            setReviewNotice('Checking your comment...');
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to retry checking.');
        }
    };

    const selectFile = (selected?: File) => {
        if (!allowMedia || !selected) return;
        if (!allowed.includes(selected.type) || selected.size > maxFileBytes) {
            setError('Choose a PNG, JPEG, WebP, or GIF image up to 5 MB.');
            return;
        }
        setFile(selected);
        setError('');
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canInteract) { onJoin(isReply ? 'reply to a comment' : 'comment on a post'); return; }
        if (!valid || busy) return;
        setBusy(true); setError(''); setReviewNotice('');
        try {
            if (onSubmitText) {
                await onSubmitText(body.trim());
                setBody(''); setEmojiOpen(false);
                return;
            }
            if (postId === undefined) throw new Error('Comment destination is unavailable.');
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const payload = new FormData();
            if (body.trim()) payload.append('body', body.trim());
            if (file) payload.append('media', file);
            if (parentId !== null) payload.append('parent_id', String(parentId));
            const response = await fetch(`/posts/${postId}/comments`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: payload,
            });
            if (!response.ok) {
                if (response.status === 419) throw new Error('Session expired. Refresh and try again.');
                if (response.status === 422) {
                    const details = await response.json().catch(() => ({})) as { errors?: Record<string, string[]>; message?: string };
                    throw new Error(Object.values(details.errors ?? {})[0]?.[0] ?? details.message ?? 'Please check your comment.');
                }
                throw new Error('Unable to save your comment. Please try again.');
            }
            const result = await response.json() as { comment: SavedComment; check_status?: string | null };
            if (result.check_status === 'pending_check') {
                setPendingReview({ id: result.comment.id, submittedBody: body.trim() });
                setReviewNotice(isReply ? 'Checking your reply...' : 'Checking your comment...');
            } else {
                onCreated?.(result.comment);
            }
            setBody(''); if (!compact && postId !== undefined) commentDrafts.delete(postId); setFile(null); setEmojiOpen(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save your comment.');
        } finally { setBusy(false); }
    };

    return <form className={`pm-comment-compose${compact ? ' pm-comment-compose--reply' : ''}`} onSubmit={event => { void submit(event); }} aria-label={isReply ? `Reply to ${replyToName ?? 'comment'}` : 'Write a comment'}>
        <Avatar name={avatarName} src={avatarSrc} size={compact ? 32 : 38} />
        <div className="pm-comment-compose-field">
            {isReply && <div className="pm-comment-reply-context"><span>Reply to {replyToName ?? 'comment'}</span><button type="button" onClick={onCancel} aria-label="Cancel reply"><X size={15}/></button></div>}
            <textarea ref={editor} aria-label={isReply ? 'Write a reply' : 'Add a comment'}
                placeholder={isReply ? `Reply to ${replyToName ?? 'comment'}...` : 'Write a comment...'}
                maxLength={maxLength} rows={compact ? 1 : 2} value={body}
                onChange={event => { setBody(event.target.value); if (!compact && postId !== undefined) commentDrafts.set(postId, event.target.value); }} readOnly={!canInteract}
                onFocus={() => { if (!canInteract) onJoin(isReply ? 'reply to a comment' : 'comment on a post'); }}/>
            {allowMedia && preview && <div className="pm-comment-media-preview"><img src={preview} alt="Selected attachment preview"/><span>{file?.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Remove image"><X size={17}/></button></div>}
            <div className="pm-comment-compose-toolbar">
                <div className="pm-comment-tools">
                    <button type="button" title="Insert emoji" aria-label="Insert emoji" aria-expanded={emojiOpen} disabled={!canInteract || busy} onClick={() => setEmojiOpen(open => !open)}><Smile size={19}/></button>
                    {allowMedia && <>
                        <button type="button" title="Attach an image or GIF" aria-label="Attach an image or GIF" disabled={!canInteract || busy} onClick={() => photoInput.current?.click()}><ImagePlus size={19}/></button>
                        <input type="file" ref={photoInput} hidden accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ''; }}/>
                    </>}
                </div>
                <span className="pm-comment-character-count">{Array.from(body).length}/{maxLength}</span>
                <button className="pm-button pm-button-sm pm-comment-submit" type="submit" disabled={!canInteract || !valid || busy || Boolean(pendingReview)}>
                    <Send size={16} aria-hidden="true"/>{busy ? 'Sending...' : isReply ? 'Reply' : 'Comment'}
                </button>
            </div>
            {emojiOpen && <div className="pm-comment-emoji-list" role="group" aria-label="Choose an emoji">{emojis.map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => { setBody(previous => { const value = previous + emoji; if (!compact && postId !== undefined) commentDrafts.set(postId, value); return value; }); editor.current?.focus(); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
            {reviewNotice && <p className="pm-inline-comment-info" role="status">{reviewNotice}{failedComment && <button type="button" className="pm-button pm-button-outline pm-button-sm" onClick={() => void retryFailedReview()}>Retry check</button>}</p>}
            {error && <p className="pm-inline-comment-error" role="alert">{error}</p>}
        </div>
    </form>;
}
