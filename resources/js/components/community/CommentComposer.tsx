import { usePage } from '@inertiajs/react';
import { ImagePlus, Send, Smile, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CommentFeedback } from './CommentFeedback';
import { Avatar } from '@/components/pm/Avatar';
import { requestKey } from '@/lib/request-key';
import type { RequestToJoin } from '@/components/home/HomeEngagement';

export type SavedComment = {
    id: number;
    body: string;
    media_url?: string | null;
    created_at: string;
    likes_count: number;
    viewer_liked: boolean;
    viewer_reaction?: import('@/components/home/HomeEngagement').ReactionType | null;
    author: { name: string; avatar_path?: string | null; profile_url?: string | null };
    replies: SavedComment[];
    replies_count?: number;
    version?: number | null;
    post_comments_count?: number | null;
    root_replies_count?: number | null;
};

const emojis = ['🙂', '😊', '❤️', '👍', '👏', '🙌', '🎉', '🤝', '💡', '🚀', '😮', '😢'];
const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const maxFileBytes = 5 * 1024 * 1024;
const commentDrafts = new Map<number, string>();
const MAX_DRAFTS = 24;
type PendingReview = { id: number; submittedBody: string };
const pendingComments = new Map<string, PendingReview>();
let draftViewer = 0;

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
    const viewer = usePage<{ auth?: { user?: { id: number } | null } }>().props.auth?.user?.id ?? 0;
    if (draftViewer !== viewer) { commentDrafts.clear(); pendingComments.clear(); draftViewer = viewer; }
    const [body, setBody] = useState(() => compact || postId === undefined ? '' : (commentDrafts.get(postId) ?? ''));
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pendingKey = `${viewer}:${postId ?? 0}:${parentId ?? 0}`;
    const [reviewNotice, setReviewNotice] = useState(() => pendingComments.has(pendingKey) ? 'Checking your comment...' : '');
    const [pendingReview, setPendingReviewState] = useState<PendingReview | null>(() => pendingComments.get(pendingKey) ?? null);
    const setPendingReview = (value: PendingReview | null) => {
        if (value) {
            if (!pendingComments.has(pendingKey) && pendingComments.size >= MAX_DRAFTS) pendingComments.delete(pendingComments.keys().next().value!);
            pendingComments.set(pendingKey, value);
        } else pendingComments.delete(pendingKey);
        setPendingReviewState(value);
    };
    const [failedComment, setFailedComment] = useState<number | null>(null);
    const onCreatedRef = useRef(onCreated);
    useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
    const submission = useRef<{ key: string; body: string; file: File | null; parentId: number | null; postId: number } | null>(null);
    const sending = useRef(false);
    const photoInput = useRef<HTMLInputElement>(null);
    const editor = useRef<HTMLTextAreaElement>(null);
    const isReply = parentId !== null;
    const rememberDraft = (value: string) => {
        if (compact || postId === undefined || !viewer) return true;
        if (!value) { commentDrafts.delete(postId); return true; }
        if (!commentDrafts.has(postId) && commentDrafts.size >= MAX_DRAFTS) {
            setError('Save or clear another comment draft before starting a new one.');
            return false;
        }
        commentDrafts.set(postId, value); return true;
    };
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
        let inFlight = false;
        let delay = 3000;
        let timer: number | undefined;
        const abort = new AbortController();
        const poll = async () => {
            if (settled || inFlight || !live) return;
            if (document.visibilityState === 'hidden') { timer = window.setTimeout(() => { void poll(); }, 10000); return; }
            inFlight = true;
            try {
                const response = await fetch(`/posts/${postId}/comments/${pendingReview.id}/check-status`, {
                    credentials: 'same-origin', signal: abort.signal, headers: { Accept: 'application/json' },
                });
                if (!live || settled) return;
                if (response.status === 404 || response.status === 410 || response.status === 403) {
                    settled = true; setPendingReview(null); setReviewNotice(''); setError('This comment is no longer available.'); return;
                }
                if (!response.ok) return;
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
                    setBody(previous => previous || pendingReview.submittedBody);
                    setError(`Not published. ${result.reason || 'Your comment did not meet the community policy. Edit and submit again.'}`);
                    setReviewNotice(''); setPendingReview(null);
                } else if (result.status === 'check_error') {
                    settled = true;
                    setFailedComment(pendingReview.id);
                    setReviewNotice('Your comment could not be checked. It has not been published.');
                    setPendingReview(null);
                } else if (result.status === 'pending_review') {
                    settled = true;
                    setReviewNotice('');
                    setError('This comment has not been published. Please revise it and try again.');
                    setPendingReview(null);
                }
            } catch { /* The next poll retries; never expose unchecked comments. */ }
            finally {
                inFlight = false;
                if (live && !settled) {
                    delay = Math.min(30000, Math.round(delay * 1.5));
                    timer = window.setTimeout(() => { void poll(); }, delay + Math.floor(Math.random() * 1000));
                }
            }
        };
        void poll();
        return () => { live = false; abort.abort(); if (timer !== undefined) window.clearTimeout(timer); };
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
        if (!valid || sending.current || pendingReview) return;
        sending.current = true;
        setBusy(true); setError(''); setReviewNotice('');
        try {
            if (onSubmitText) {
                await onSubmitText(body.trim());
                setBody(''); setEmojiOpen(false);
                return;
            }
            if (postId === undefined) throw new Error('Comment destination is unavailable.');
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
            const text = body.trim();
            const intent = submission.current;
            if (!intent || intent.body !== text || intent.file !== file || intent.parentId !== parentId || intent.postId !== postId) {
                submission.current = { key: requestKey(), body: text, file, parentId, postId };
            }
            const payload = new FormData();
            payload.append('submission_key', submission.current!.key);
            if (body.trim()) payload.append('body', body.trim());
            if (file) payload.append('media', file);
            if (parentId !== null) payload.append('parent_id', String(parentId));
            const response = await fetch(`/posts/${postId}/comments`, {
                method: 'POST', credentials: 'same-origin',
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token },
                body: payload,
            });
            if (!response.ok) {
                if (response.status === 409 || response.status === 410) { submission.current = null; throw new Error(response.status === 410 ? 'This comment was deleted. Submit again to create a new comment.' : 'This submission no longer matches the original. Please submit again.'); }
                if (response.status === 419) throw new Error('Session expired. Refresh and try again.');
                if (response.status === 422) {
                    const details = await response.json().catch(() => ({})) as { errors?: Record<string, string[]>; message?: string };
                    throw new Error(Object.values(details.errors ?? {})[0]?.[0] ?? details.message ?? 'Please check your comment.');
                }
                throw new Error('Unable to save your comment. Please try again.');
            }
            const result = await response.json() as { comment: SavedComment; check_status?: string | null };
            submission.current = null;
            if (result.check_status === 'pending_check') {
                setPendingReview({ id: result.comment.id, submittedBody: body.trim() });
                setReviewNotice(isReply ? 'Checking your reply...' : 'Checking your comment...');
            } else if (!result.check_status || result.check_status === 'approved') {
                onCreated?.(result.comment);
            } else {
                setError('Your comment has not been published. Please revise it and try again.');
                return;
            }
            setBody(''); if (!compact && postId !== undefined) commentDrafts.delete(postId); setFile(null); setEmojiOpen(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Unable to save your comment.');
        } finally { sending.current = false; setBusy(false); }
    };

    return <form data-feed-pin={Boolean(body || file || busy || pendingReview || failedComment) || undefined} className={`pm-comment-compose${compact ? ' pm-comment-compose--reply' : ''}`} onSubmit={event => { void submit(event); }} aria-label={isReply ? `Reply to ${replyToName ?? 'comment'}` : 'Write a comment'}>
        <Avatar name={avatarName} src={avatarSrc} size={compact ? 32 : 38} />
        <div className="pm-comment-compose-field">
            {isReply && <div className="pm-comment-reply-context"><span>Reply to {replyToName ?? 'comment'}</span><button type="button" onClick={onCancel} aria-label="Cancel reply"><X size={15}/></button></div>}
            <textarea ref={editor} aria-label={isReply ? 'Write a reply' : 'Add a comment'}
                placeholder={isReply ? `Reply to ${replyToName ?? 'comment'}...` : 'Write a comment...'}
                maxLength={maxLength} rows={compact ? 1 : 2} value={body}
                onChange={event => { if (rememberDraft(event.target.value)) setBody(event.target.value); }} readOnly={!canInteract}
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
            {emojiOpen && <div className="pm-comment-emoji-list" role="group" aria-label="Choose an emoji">{emojis.map(emoji => <button key={emoji} type="button" aria-label={`Insert ${emoji}`} onClick={() => { const value = body + emoji; if (rememberDraft(value)) setBody(value); editor.current?.focus(); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
            {(reviewNotice || error) && <div className="pm-comment-feedback-stack">
                {reviewNotice && <CommentFeedback tone={failedComment ? 'warning' : pendingReview ? 'checking' : 'info'} message={reviewNotice}>
                    {pendingReview?.submittedBody && <p>{pendingReview.submittedBody}</p>}
                    {failedComment && <button type="button" className="pm-button pm-button-outline pm-button-sm" onClick={() => void retryFailedReview()}>Retry check</button>}
                </CommentFeedback>}
                {error && <CommentFeedback tone="error" message={error}/>}
            </div>}
        </div>
    </form>;
}
