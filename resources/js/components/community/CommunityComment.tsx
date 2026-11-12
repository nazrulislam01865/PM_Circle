import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { CommentEngagementActions } from './CommentEngagementActions';
import { CommentComposer, type SavedComment } from './CommentComposer';
import type { ReactionType } from '@/components/home/HomeEngagement';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';

export type CommunityCommentData = {
    id: number; body: string; media_url?: string | null; created_at: string; likes_count: number;
    author: { name: string; profile?: { avatar_path?: string | null } | null }; replies: CommunityCommentData[];
};
const relativeTime = (created: string) => {
    const minutes = Math.max(1, Math.floor((Date.now() - Date.parse(created)) / 60000));
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
};

const displaySaved = (comment: SavedComment): CommunityCommentData => ({
    ...comment,
    author: { name: comment.author.name, profile: { avatar_path: comment.author.avatar_path } },
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
    const liked = likedIds.includes(comment.id);
    const viewerReaction = viewerReactions?.[comment.id] ?? (liked ? 'like' : null);
    const parentId = replyParentId ?? comment.id;
    const replies = [...(comment.replies ?? []), ...newReplies];

    const handleReply = (saved: SavedComment) => {
        const savedReply = displaySaved(saved);
        setReplying(false);
        if (nested) onCreatedReply?.(savedReply);
        else { setNewReplies(previous => [...previous, savedReply]); setExpanded(true); }
        onCommentAdded?.();
    };

    return <div className={nested ? 'pm-thread-reply' : 'pm-thread-comment'}>
        <div className="pm-thread-portrait"><Avatar name={comment.author.name} src={comment.author.profile?.avatar_path} size={nested ? 32 : 38}/></div>
        <div className="pm-thread-body">
            <div className="pm-thread-author"><strong>{comment.author.name}</strong>{comment.author.name === postAuthor && <span className="pm-author-chip">Author</span>}<span>· {relativeTime(comment.created_at)}</span></div>
            {comment.body && <p>{comment.body}</p>}
            {comment.media_url && <img className="pm-comment-attachment" src={comment.media_url} alt="Comment attachment" loading="lazy"/>}
            <div className="pm-thread-actions"><CommentEngagementActions postId={postId} commentId={comment.id}
                initial={viewerReaction} total={comment.likes_count} canInteract={canInteract} onJoin={() => router.visit('/login')}
                onReply={() => canInteract ? setReplying(previous => !previous) : router.visit('/login')}
                replying={replying}/></div>
            {replying && canInteract && <CommentComposer postId={postId} parentId={parentId} compact
                avatarName={viewer.name} avatarSrc={viewer.avatar_path} replyToName={comment.author.name}
                canInteract={canInteract} onJoin={() => router.visit('/login')} onCancel={() => setReplying(false)}
                onCreated={handleReply}/>}
            {!nested && replies.length > 0 && <div className="pm-thread-branch">
                <button type="button" className="pm-thread-toggle" aria-expanded={expanded} onClick={() => setExpanded(previous => !previous)}>
                    <ChevronDown size={15} className={expanded ? 'pm-rotate' : ''} aria-hidden="true"/>
                    {expanded ? 'Hide' : 'View'} {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </button>
                {expanded && replies.map(child => <CommunityComment key={child.id} comment={child} postId={postId}
                    postAuthor={postAuthor} canInteract={canInteract} likedIds={likedIds} viewerReactions={viewerReactions}
                    nested demo={demo} replyParentId={comment.id} viewer={viewer} onCommentAdded={onCommentAdded}
                    onCreatedReply={saved => { setNewReplies(previous => [...previous, saved]); setExpanded(true); }}/>) }
            </div>}
        </div>
    </div>;
}
