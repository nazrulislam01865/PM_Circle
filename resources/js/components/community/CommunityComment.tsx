import { PostAuthorLink } from './PostAuthorLinks';
import { CommunityResponsiveImage } from './CommunityResponsiveImage';
import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { CommentEngagementActions } from './CommentEngagementActions';
import { CommentComposer, type SavedComment } from './CommentComposer';
import type { ReactionType } from '@/components/home/HomeEngagement';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';

export type CommunityCommentData = {
    id: number; body: string; media_url?: string | null; created_at: string; likes_count: number;
    author: { name: string; id?: number; profile_url?: string | null; profile?: { avatar_path?: string | null } | null }; replies: CommunityCommentData[];
    replies_count?: number; viewer_reaction?: ReactionType | null;
};
const relativeTime = (created: string) => {
    const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(created)) / 60000));
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
};

const displaySaved = (comment: SavedComment): CommunityCommentData => ({
    ...comment,
    author: { name: comment.author.name, profile_url: comment.author.profile_url ?? null, profile: { avatar_path: comment.author.avatar_path } },
    replies: [],
});

/** Parent and nested replies use the same two-action reaction bar and inline editor. */
export function CommunityComment({ comment, postId, postAuthor, canInteract, likedIds, viewerReactions, nested = false, demo = false, replyParentId, viewer, onCommentAdded, onCreatedReply }: {
    comment: CommunityCommentData; postId: number; postAuthor: string;
    canInteract: boolean; likedIds: number[]; viewerReactions?: Record<number, ReactionType>;
    nested?: boolean; demo?: boolean; replyParentId?: number;
    viewer: { name: string; avatar_path?: string | null };
    onCommentAdded?: () => void; onCreatedReply?: (comment: CommunityCommentData) => void;
}) {
    const [replying, setReplying] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [newReplies, setNewReplies] = useState<CommunityCommentData[]>([]);
    const [moreReplies, setMoreReplies] = useState<CommunityCommentData[]>([]);
    const [hasMoreReplies, setHasMoreReplies] = useState((comment.replies_count ?? comment.replies?.length ?? 0) > (comment.replies?.length ?? 0));
    const [loadingReplies, setLoadingReplies] = useState(false);
    const [replyError, setReplyError] = useState('');
    const liked = likedIds.includes(comment.id);
    const viewerReaction = comment.viewer_reaction ?? viewerReactions?.[comment.id] ?? (liked ? 'like' : null);
    const parentId = replyParentId ?? comment.id;
    const serverReplies = [...(comment.replies ?? []), ...moreReplies];
    const replies = [...serverReplies, ...newReplies];
    const replyTotal = Math.max(comment.replies_count ?? 0, replies.length);

    const loadMoreReplies = async () => {
        if (loadingReplies || !hasMoreReplies) return;
        setLoadingReplies(true); setReplyError('');
        try {
            const after = serverReplies.at(-1)?.id;
            const response = await fetch(`/posts/${postId}/comments/${comment.id}/replies${after ? `?after=${after}` : ''}`, {
                headers: { Accept: 'application/json' }, credentials: 'same-origin',
            });
            if (!response.ok) throw new Error('Unable to load replies. Please retry.');
            const result = await response.json() as { data: SavedComment[]; has_more: boolean };
            setMoreReplies(previous => {
                const known = new Set([...comment.replies.map(reply => reply.id), ...previous.map(reply => reply.id)]);
                return [...previous, ...result.data.filter(reply => !known.has(reply.id)).map(displaySaved)];
            });
            setHasMoreReplies(result.has_more);
        } catch (error) {
            setReplyError(error instanceof Error ? error.message : 'Unable to load replies.');
        } finally {
            setLoadingReplies(false);
        }
    };

    const handleReply = (saved: SavedComment) => {
        const savedReply = displaySaved(saved);
        setReplying(false);
        if (nested) onCreatedReply?.(savedReply);
        else { setNewReplies(previous => [...previous, savedReply]); setExpanded(true); }
        onCommentAdded?.();
    };

    // Detail responses already include the public-only author.profile relation;
    // newly posted and paginated replies carry a server-filtered profile URL.
    const authorHref = 'profile_url' in comment.author ? comment.author.profile_url
        : comment.author.id && comment.author.profile ? `/members/${comment.author.id}` : undefined;
    return <div className={nested ? 'pm-thread-reply' : 'pm-thread-comment'}>
        <div className="pm-thread-portrait"><PostAuthorLink href={authorHref} name={comment.author.name} avatar><Avatar name={comment.author.name} src={comment.author.profile?.avatar_path} size={nested ? 32 : 38}/></PostAuthorLink></div>
        <div className="pm-thread-body">
            <div className="pm-thread-author"><strong><PostAuthorLink href={authorHref} name={comment.author.name}>{comment.author.name}</PostAuthorLink></strong>{comment.author.name === postAuthor && <span className="pm-author-chip">Author</span>}<span>· {relativeTime(comment.created_at)}</span></div>
            {comment.body && <p>{comment.body}</p>}
            {comment.media_url && <CommunityResponsiveImage className="pm-comment-attachment" src={comment.media_url} alt="Comment attachment" sizes="(max-width: 640px) 85vw, 480px"/>}
            <div className="pm-thread-actions"><CommentEngagementActions postId={postId} commentId={comment.id}
                initial={viewerReaction} total={comment.likes_count} canInteract={canInteract} onJoin={() => router.visit('/login')}
                onReply={() => canInteract ? setReplying(previous => !previous) : router.visit('/login')}
                replying={replying}/></div>
            {replying && canInteract && <CommentComposer postId={postId} parentId={parentId} compact
                avatarName={viewer.name} avatarSrc={viewer.avatar_path} replyToName={comment.author.name}
                canInteract={canInteract} onJoin={() => router.visit('/login')} onCancel={() => setReplying(false)}
                onCreated={handleReply}/>}
            {!nested && (replies.length > 0 || hasMoreReplies) && <div className="pm-thread-branch">
                <button type="button" className="pm-thread-toggle" aria-expanded={expanded} onClick={() => setExpanded(previous => !previous)}>
                    <ChevronDown size={15} className={expanded ? 'pm-rotate' : ''} aria-hidden="true"/>
                    {expanded ? 'Hide' : 'View'} {replyTotal} {replyTotal === 1 ? 'reply' : 'replies'}
                </button>
                {expanded && replies.map(child => <CommunityComment key={child.id} comment={child} postId={postId}
                    postAuthor={postAuthor} canInteract={canInteract} likedIds={likedIds} viewerReactions={viewerReactions}
                    nested demo={demo} replyParentId={comment.id} viewer={viewer} onCommentAdded={onCommentAdded}
                    onCreatedReply={saved => { setNewReplies(previous => [...previous, saved]); setExpanded(true); }}/>) }
                {expanded && hasMoreReplies && <button type="button" className="pm-thread-toggle" disabled={loadingReplies} onClick={() => { void loadMoreReplies(); }}>{loadingReplies ? 'Loading replies...' : 'Load more replies'}</button>}
                {expanded && replyError && <p role="alert">{replyError}</p>}
            </div>}
        </div>
    </div>;
}
