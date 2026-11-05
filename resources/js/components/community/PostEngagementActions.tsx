import { router } from '@inertiajs/react';
import { Bookmark, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { InlinePostComments } from './InlinePostComments';
import { HomeCommentAction, HomeShareAction, ReactionPicker, type ReactionType, type RequestToJoin } from '@/components/home/HomeEngagement';

/** A single interaction contract for homepage, dashboard and public community posts. */
export function PostEngagementActions({ postId, initial, total, comments, canInteract, onJoin, showSave = false, saved = false, inlineComments = true }: {
    postId: number;
    initial?: ReactionType | null;
    total: number;
    comments: number;
    canInteract: boolean;
    onJoin: RequestToJoin;
    showSave?: boolean;
    saved?: boolean;
    inlineComments?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const [commentCount, setCommentCount] = useState(comments);
    useEffect(() => setCommentCount(comments), [comments, postId]);
    const url = `/posts/${postId}`;
    const toggleSave = () => {
        if (!canInteract) { onJoin('save a post'); return; }
        if (saved) router.delete(`${url}/save`, { preserveScroll: true });
        else router.post(`${url}/save`, {}, { preserveScroll: true });
    };
    return <div className="pm-engagement-shell"><div className="pm-engagement-actions">
        <ReactionPicker endpoint={`${url}/reactions`} initial={initial} total={total} canInteract={canInteract} onJoin={onJoin} />
        {inlineComments ? <button type="button" className="pm-home-action" aria-expanded={expanded} aria-controls={`inline-comments-${postId}`}
            onClick={() => { if (!canInteract) onJoin('comment on a discussion'); else setExpanded(previous => !previous); }}>
            <MessageCircle size={19} aria-hidden="true"/> {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button> : <HomeCommentAction label={commentCount === 1 ? 'comment' : 'comments'} count={commentCount} href={`${url}#post-comments`} canInteract={canInteract} onJoin={onJoin} />}
        <HomeShareAction href={url} canInteract={canInteract} onJoin={onJoin} />
        {showSave && <button type="button" className="pm-home-action" aria-pressed={saved} onClick={toggleSave}>
            <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /> {saved ? 'Saved' : 'Save'}
        </button>}
    </div>
        {inlineComments && expanded && <InlinePostComments postId={postId} canInteract={canInteract} onJoin={onJoin}
            onPosted={() => setCommentCount(previous => previous + 1)} onClose={() => setExpanded(false)} />}
    </div>;
}
