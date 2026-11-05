import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, MessageCircle, Send, ThumbsUp } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import type { RequestToJoin } from '@/components/home/HomeEngagement';

type PostComment = {
    id: number;
    body: string;
    created_at: string;
    likes_count: number;
    viewer_liked: boolean;
    author: { name: string; avatar_path?: string | null };
    replies: PostComment[];
};
type PreviewResponse = { data: PostComment[]; has_more: boolean };

const csrfHeaders = () => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
});

const errorMessage = async (response: Response): Promise<string> => {
    if (response.status === 419) return 'Your session expired. Refresh and try again.';
    if (response.status === 422) {
        const payload = await response.json().catch(() => ({})) as { errors?: { body?: string[] }; message?: string };
        return payload.errors?.body?.[0] ?? payload.message ?? 'Please check your comment.';
    }
    return 'Unable to complete the request. Please try again.';
};

function CommentEntry({ comment, postId, onJoin, canInteract, onReply, onLike, replying, busy }: {
    comment: PostComment;
    postId: number;
    onJoin: RequestToJoin;
    canInteract: boolean;
    onReply: (id: number) => void;
    onLike: (id: number) => void;
    replying: number | null;
    busy: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const created = Date.parse(comment.created_at);
    const minutes = Number.isFinite(created) ? Math.max(1, Math.floor((Date.now() - created) / 60000)) : 0;
    const ago = minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`;
    return <div className="pm-inline-comment-item">
        <Avatar name={comment.author.name} src={comment.author.avatar_path} size={36}/>
        <div className="pm-inline-comment-content">
            <div className="pm-inline-comment-bubble"><div className="pm-inline-comment-author"><strong>{comment.author.name}</strong><span>{ago}</span></div><p>{comment.body}</p></div>
            <div className="pm-inline-comment-actions">
                <button type="button" onClick={() => canInteract ? onLike(comment.id) : onJoin('like a comment')} disabled={busy} aria-pressed={comment.viewer_liked}>
                    <ThumbsUp size={15} aria-hidden="true"/> {comment.viewer_liked ? 'Liked' : 'Like'}{comment.likes_count > 0 ? ` · ${comment.likes_count}` : ''}
                </button>
                <button type="button" onClick={() => canInteract ? onReply(comment.id) : onJoin('reply to a comment')} aria-expanded={replying === comment.id}>
                    <MessageCircle size={15} aria-hidden="true"/> Reply
                </button>
            </div>
            {comment.replies.length > 0 && <div className="pm-inline-comment-branch">
                <button type="button" className="pm-inline-comment-replies-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </button>
                {expanded && comment.replies.map(reply => <CommentEntry key={reply.id} comment={reply} postId={postId}
                    onJoin={onJoin} canInteract={canInteract} onLike={onLike} onReply={() => onReply(comment.id)} replying={replying} busy={busy} />)}
            </div>}
        </div>
    </div>;
}

/** One on-demand comment experience shared by homepage, member feed and community cards. */
export function InlinePostComments({ postId, canInteract, onJoin, onPosted, onClose }: {
    postId: number; canInteract: boolean; onJoin: RequestToJoin; onPosted: () => void; onClose: () => void;
}) {
    const { auth } = usePage<{ auth?: { user?: { name: string; avatar_path?: string | null } | null } }>().props;
    const [comments, setComments] = useState<PostComment[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState<number | null>(null);
    const [sort, setSort] = useState<'relevant' | 'newest'>('relevant');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        fetch(`/posts/${postId}/comments/preview?sort=${sort}`, {
            headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: controller.signal,
        })
            .then(async response => { if (!response.ok) throw new Error('Unable to load comments.'); return response.json() as Promise<PreviewResponse>; })
            .then(data => { setComments(data.data); setHasMore(data.has_more); })
            .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load comments.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [postId, sort]);

    const startReply = (id: number) => {
        setReplyTo(previous => previous === id ? null : id);
        textareaRef.current?.focus();
    };

    const post = async (event: FormEvent) => {
        event.preventDefault();
        if (!canInteract) { onJoin('comment on a discussion'); return; }
        if (text.trim().length < 2 || busy) { setError('Please write at least two characters.'); return; }
        setBusy(true); setError('');
        try {
            const response = await fetch(`/posts/${postId}/comments`, {
                method: 'POST', credentials: 'same-origin', headers: csrfHeaders(),
                body: JSON.stringify({ body: text.trim(), parent_id: replyTo }),
            });
            if (!response.ok) throw new Error(await errorMessage(response));
            const item = await response.json() as { comment: PostComment };
            if (replyTo) {
                setComments(previous => previous.map(comment => comment.id === replyTo
                    ? { ...comment, replies: [...comment.replies, item.comment] } : comment));
            } else {
                setComments(previous => [item.comment, ...previous]);
            }
            setText(''); setReplyTo(null); onPosted();
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to post comment.'); }
        finally { setBusy(false); }
    };

    const like = async (commentId: number) => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const response = await fetch(`/posts/${postId}/comments/${commentId}/like`, {
                method: 'POST', credentials: 'same-origin', headers: csrfHeaders(), body: '{}',
            });
            if (!response.ok) throw new Error(await errorMessage(response));
            const data = await response.json() as { liked: boolean; count: number };
            const update = (comment: PostComment): PostComment => comment.id === commentId
                ? { ...comment, viewer_liked: data.liked, likes_count: data.count }
                : { ...comment, replies: comment.replies.map(update) };
            setComments(previous => previous.map(update));
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update your comment reaction.'); }
        finally { setBusy(false); }
    };

    return <section className="pm-inline-comments" aria-label="Comments on this post" id={`inline-comments-${postId}`}>
        <div className="pm-inline-comments-head"><strong>Comments</strong><button type="button" className="pm-inline-close" onClick={onClose} aria-label="Close comments">Close</button></div>
        <form className="pm-inline-comments-compose" onSubmit={post}>
            <Avatar name={auth?.user?.name || 'Community member'} src={auth?.user?.avatar_path} size={38}/>
            <div className="pm-inline-compose-field">
                {replyTo && <div className="pm-inline-reply-note">Replying to a comment <button type="button" onClick={() => setReplyTo(null)}>Cancel reply</button></div>}
                <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)} minLength={2} maxLength={3000}
                    rows={2} aria-label={replyTo ? 'Write a reply' : 'Add a comment'} placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                    onFocus={() => { if (!canInteract) onJoin('comment on a discussion'); }} />
                <div className="pm-inline-compose-actions"><span>{text.length}/3000</span><button type="submit" disabled={busy || text.trim().length < 2} className="pm-button pm-button-sm"><Send size={15} aria-hidden="true"/> {busy ? 'Posting...' : replyTo ? 'Reply' : 'Post'}</button></div>
            </div>
        </form>
        <div className="pm-inline-comments-sort-row">
            <label className="pm-inline-sort-control" htmlFor={`comment-sort-${postId}`}>
                <span className="sr-only">Sort comments</span>
                <select id={`comment-sort-${postId}`} value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
                    <option value="relevant">Most relevant</option>
                    <option value="newest">Newest first</option>
                </select>
                <ChevronDown size={18} aria-hidden="true" />
            </label>
        </div>
        {error && <p className="pm-inline-comment-error" role="alert">{error}</p>}
        {loading ? <p className="pm-inline-comments-status" role="status">Loading comments...</p> : comments.length === 0 ? <p className="pm-inline-comments-status">No comments yet. Start the conversation.</p> : <div className="pm-inline-comments-list">
            {comments.map(comment => <CommentEntry key={comment.id} comment={comment} postId={postId} canInteract={canInteract}
                onJoin={onJoin} onReply={startReply} onLike={like} replying={replyTo} busy={busy}/>)}</div>}
        {hasMore && <Link className="pm-inline-comments-more" href={`/posts/${postId}#post-comments`}>View all comments</Link>}
    </section>;
}
