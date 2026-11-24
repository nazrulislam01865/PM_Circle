import { useIsMobile } from '@/hooks/use-mobile';
import { Bookmark, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InlinePostComments } from './InlinePostComments';
import { EngagementActionBar } from './EngagementActionBar';
import { PostReactionSummary, type ReactionCounts } from './PostReactions';
import { HomeCommentAction, ReactionPicker, type ReactionType, type RequestToJoin } from '@/components/home/HomeEngagement';

import type { PostSecondaryActions } from './usePostSecondaryActions';

const EMPTY_REACTION_COUNTS: ReactionCounts = {};

// Preserve open discussion state when a post leaves the virtual window.
const openCommentPosts = new Set<number>();

/** A single interaction contract for homepage, dashboard and public community posts. */
export function PostEngagementActions({ postId, initial, total, breakdown = EMPTY_REACTION_COUNTS, comments, canInteract, onJoin, showSave = false, secondary, inlineComments = true, onReactionChange, onCommentAdded }: {
    postId: number;
    initial?: ReactionType | null;
    total: number;
    breakdown?: ReactionCounts;
    comments: number;
    canInteract: boolean;
    onJoin: RequestToJoin;
    showSave?: boolean;
    secondary: PostSecondaryActions;
    inlineComments?: boolean;
    onReactionChange?: (reaction: ReactionType | null, count: number, counts: ReactionCounts) => void;
    onCommentAdded?: () => void;
}) {
    const isMobile = useIsMobile();
    const [summaryTotal, setSummaryTotal] = useState(total);
    const [summaryCounts, setSummaryCounts] = useState<ReactionCounts>(breakdown);
    const lastReaction = useRef<ReactionType | null>(initial ?? null);
    useEffect(() => {
        setSummaryTotal(total);
        setSummaryCounts(breakdown);
        lastReaction.current = initial ?? null;
    }, [postId, breakdown, total, initial]);
    const handleReactionChange = (reaction: ReactionType | null, count: number) => {
        const before = lastReaction.current;
        lastReaction.current = reaction;
        setSummaryTotal(count);
        const next = { ...summaryCounts };
        if (before) next[before] = Math.max(0, (next[before] ?? 0) - 1);
        if (reaction) next[reaction] = (next[reaction] ?? 0) + 1;
        setSummaryCounts(next);
        onReactionChange?.(reaction, count, next);
    };
    const [expanded, setExpanded] = useState(() => openCommentPosts.has(postId));
    const toggleExpanded = () => setExpanded(previous => {
        if (previous) openCommentPosts.delete(postId);
        else openCommentPosts.add(postId);
        return !previous;
    });
    const [commentCount, setCommentCount] = useState(comments);
    useEffect(() => setCommentCount(comments), [comments, postId]);
    const url = `/posts/${postId}`;
    const reactionSummary = <PostReactionSummary postId={postId} total={summaryTotal} counts={summaryCounts}
        onRefresh={(count, counts) => { setSummaryTotal(count); setSummaryCounts(counts); }} />;
    return <div className="pm-engagement-shell"><EngagementActionBar className="pm-post-engagement-row">
        <div className="pm-post-reaction-group"><ReactionPicker endpoint={`${url}/reactions`} initial={initial} total={total} canInteract={canInteract} onJoin={onJoin} onChanged={handleReactionChange} showCount={false} />
        {isMobile && (summaryTotal > 0 ? reactionSummary : <span className="pm-post-reaction-zero" aria-label="No reactions">0</span>)}</div>
        {inlineComments ? <button type="button" className="pm-home-action" aria-expanded={expanded} aria-controls={`inline-comments-${postId}`}
            onClick={() => { if (!canInteract) onJoin('comment on a discussion'); else toggleExpanded(); }}>
            <MessageCircle size={19} aria-hidden="true"/> {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button> : <HomeCommentAction label={commentCount === 1 ? 'comment' : 'comments'} count={commentCount} href={`${url}#post-comments`} canInteract={canInteract} onJoin={onJoin} />}
        <button type="button" className="pm-home-action pm-post-desktop-action" onClick={() => { void secondary.share(); }}><Share2 size={19} aria-hidden="true"/>{secondary.copied ? 'Copied' : 'Share'}</button>
        {!isMobile && reactionSummary}
        {showSave && <button type="button" className="pm-home-action pm-post-save-action pm-post-desktop-action" aria-pressed={secondary.saved} onClick={() => { void secondary.toggleSave(); }} disabled={secondary.saveBusy}>
            <Bookmark size={19} fill={secondary.saved ? 'currentColor' : 'none'} aria-hidden="true" /> {secondary.saved ? 'Saved' : 'Save'}
        </button>}
        {(secondary.saveError || secondary.error) && <span className="pm-post-secondary-error" role="alert">{secondary.saveError || secondary.error}</span>}
        {secondary.copied && <span className="pm-post-copy-status" role="status">Link copied.</span>}
    </EngagementActionBar>
        {inlineComments && expanded && <InlinePostComments postId={postId} canInteract={canInteract} onJoin={onJoin}
            onPosted={() => { setCommentCount(previous => previous + 1); onCommentAdded?.(); }} onClose={() => { openCommentPosts.delete(postId); setExpanded(false); }} />}
    </div>;
}
