import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { CommentEngagementActions } from './CommentEngagementActions';
import { CommentComposer, type SavedComment } from './CommentComposer';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import type { RequestToJoin } from '@/components/home/HomeEngagement';

type PreviewResponse = { data: SavedComment[]; has_more: boolean };

const elapsedLabel = (createdAt: string) => {
    const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(createdAt)) / 60000));
    return minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`;
};

function CommentEntry({ comment, postId, rootId, nested = false, canInteract, onJoin, activeReply, onToggleReply, onCreatedReply, viewer }: {
    comment: SavedComment; postId: number; rootId: number; nested?: boolean;
    canInteract: boolean; onJoin: RequestToJoin;
    activeReply: number | null; onToggleReply: (id: number) => void;
    onCreatedReply: (rootId: number, reply: SavedComment) => void;
    viewer: { name: string; avatar_path?: string | null };
}) {
    const [expanded, setExpanded] = useState(false);
    return <div className={`pm-inline-comment-item${nested ? ' pm-inline-comment-item--nested' : ''}`}>
        <Avatar name={comment.author.name} src={comment.author.avatar_path} size={nested ? 32 : 36}/>
        <div className="pm-inline-comment-content">
            <div className="pm-inline-comment-author"><strong>{comment.author.name}</strong><span>{elapsedLabel(comment.created_at)}</span></div>
            {comment.body && <p className="pm-inline-comment-text">{comment.body}</p>}
            {comment.media_url && <img className="pm-comment-attachment" src={comment.media_url} alt="Comment attachment" loading="lazy"/>}
            <div className="pm-inline-comment-actions">
                <CommentEngagementActions postId={postId} commentId={comment.id} initial={comment.viewer_reaction ?? (comment.viewer_liked ? 'like' : null)}
                    total={comment.likes_count} canInteract={canInteract} onJoin={onJoin}
                    onReply={() => canInteract ? onToggleReply(comment.id) : onJoin('reply to a comment')}
                    replying={activeReply === comment.id}/>
            </div>
            {activeReply === comment.id && <CommentComposer postId={postId} parentId={rootId} compact
                avatarName={viewer.name} avatarSrc={viewer.avatar_path} replyToName={comment.author.name}
                canInteract={canInteract} onJoin={onJoin} onCancel={() => onToggleReply(comment.id)}
                onCreated={saved => { onCreatedReply(rootId, saved); setExpanded(true); onToggleReply(comment.id); }}/>
            }
            {!nested && comment.replies.length > 0 && <div className="pm-inline-comment-branch">
                <button type="button" className="pm-inline-comment-replies-toggle" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                    {expanded ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </button>
                {expanded && comment.replies.map(reply => <CommentEntry key={reply.id} comment={reply} postId={postId}
                    rootId={rootId} nested viewer={viewer} canInteract={canInteract} onJoin={onJoin}
                    activeReply={activeReply} onToggleReply={onToggleReply} onCreatedReply={onCreatedReply}/>)}
            </div>}
        </div>
    </div>;
}

/** Preview only when expanded; no per-comment database or page navigation calls. */
export function InlinePostComments({ postId, canInteract, onJoin, onPosted, onClose }: {
    postId: number; canInteract: boolean; onJoin: RequestToJoin; onPosted: () => void; onClose: () => void;
}) {
    const { auth } = usePage<{ auth?: { user?: { name: string; avatar_path?: string | null } | null } }>().props;
    const viewer = { name: auth?.user?.name ?? 'Community member', avatar_path: auth?.user?.avatar_path };
    const [comments, setComments] = useState<SavedComment[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeReply, setActiveReply] = useState<number | null>(null);
    const [sort, setSort] = useState<'relevant' | 'newest'>('relevant');

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(''); setActiveReply(null);
        fetch(`/posts/${postId}/comments/preview?sort=${sort}`, {
            headers: { Accept: 'application/json' }, credentials: 'same-origin', signal: controller.signal,
        }).then(async response => { if (!response.ok) throw new Error('Unable to load comments.'); return response.json() as Promise<PreviewResponse>; })
            .then(result => { setComments(result.data); setHasMore(result.has_more); })
            .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load comments.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [postId, sort]);

    const addReply = (rootId: number, reply: SavedComment) => {
        setComments(previous => previous.map(comment => comment.id === rootId
            ? { ...comment, replies: [...comment.replies, reply] } : comment));
        onPosted();
    };

    return <section className="pm-inline-comments" aria-label="Comments on this post" id={`inline-comments-${postId}`}>
        <div className="pm-inline-comments-head"><strong>Comments</strong><button type="button" className="pm-inline-close" onClick={onClose} aria-label="Close comments">Close</button></div>
        <CommentComposer postId={postId} avatarName={viewer.name} avatarSrc={viewer.avatar_path}
            canInteract={canInteract} onJoin={onJoin} onCreated={saved => { setComments(previous => [saved, ...previous]); onPosted(); }}/>
        <div className="pm-inline-comments-sort-row"><label className="pm-inline-sort-control" htmlFor={`comment-sort-${postId}`}>
            <span className="sr-only">Sort comments</span>
            <select id={`comment-sort-${postId}`} value={sort} onChange={event => setSort(event.target.value as typeof sort)}>
                <option value="relevant">Most relevant</option><option value="newest">Newest first</option>
            </select><ChevronDown size={18} aria-hidden="true"/>
        </label></div>
        {error && <p className="pm-inline-comment-error" role="alert">{error}</p>}
        {loading ? <p className="pm-inline-comments-status" role="status">Loading comments...</p> : comments.length === 0 ? <p className="pm-inline-comments-status">No comments yet. Start the conversation.</p> : <div className="pm-inline-comments-list">
            {comments.map(comment => <CommentEntry key={comment.id} comment={comment} postId={postId} rootId={comment.id}
                viewer={viewer} canInteract={canInteract} onJoin={onJoin} activeReply={activeReply}
                onToggleReply={id => setActiveReply(previous => previous === id ? null : id)}
                onCreatedReply={addReply}/>)}
        </div>}
        {hasMore && <Link className="pm-inline-comments-more" href={`/posts/${postId}#post-comments`}>View all comments</Link>}
    </section>;
}
