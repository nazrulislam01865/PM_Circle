import { router } from '@inertiajs/react';
import { Bookmark, MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { InlinePostComments } from './InlinePostComments';
import { EngagementActionBar } from './EngagementActionBar';
import { PostReactionSummary, type ReactionCounts } from './PostReactions';
import { HomeCommentAction, HomeShareAction, ReactionPicker, type ReactionType, type RequestToJoin } from '@/components/home/HomeEngagement';

const EMPTY_REACTION_COUNTS: ReactionCounts = {};

// Preserve open discussion state when a post leaves the virtual window.
const openCommentPosts = new Set<number>();

/** A single interaction contract for homepage, dashboard and public community posts. */
export function PostEngagementActions({ postId, initial, total, breakdown = EMPTY_REACTION_COUNTS, comments, canInteract, onJoin, showSave = false, saved = false, inlineComments = true, onReactionChange, onCommentAdded, onSavedChange, buttonLabel, prototypeIcon = false }: {
    postId: number;
    initial?: ReactionType | null;
    total: number;
    breakdown?: ReactionCounts;
    comments: number;
    canInteract: boolean;
    onJoin: RequestToJoin;
    showSave?: boolean;
    saved?: boolean;
    inlineComments?: boolean;
    onReactionChange?: (reaction: ReactionType | null, count: number) => void;
    onCommentAdded?: () => void;
    onSavedChange?: (saved: boolean) => void;
    buttonLabel?: string;
    prototypeIcon?: boolean;
}) {
    const [summaryTotal, setSummaryTotal] = useState(total);
    const [summaryCounts, setSummaryCounts] = useState<ReactionCounts>(breakdown);
    const lastReaction = useRef<ReactionType | null>(initial ?? null);
    useEffect(() => {
        setSummaryTotal(total);
        setSummaryCounts(breakdown);
        lastReaction.current = initial ?? null;
    }, [postId, breakdown]);
    const handleReactionChange = (reaction: ReactionType | null, count: number) => {
        const before = lastReaction.current;
        lastReaction.current = reaction;
        setSummaryTotal(count);
        setSummaryCounts(current => {
            const next = { ...current };
            if (before) next[before] = Math.max(0, (next[before] ?? 0) - 1);
            if (reaction) next[reaction] = (next[reaction] ?? 0) + 1;
            return next;
        });
        onReactionChange?.(reaction, count);
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
    const [saveBusy, setSaveBusy] = useState(false);
    const [saveError, setSaveError] = useState('');
    const toggleSave = async () => {
        if (!canInteract) { onJoin('save a post'); return; }
        if (saveBusy) return;
        if (!onSavedChange) {
            if (saved) router.delete(`${url}/save`, { preserveScroll: true });
            else router.post(`${url}/save`, {}, { preserveScroll: true });
            return;
        }
        setSaveBusy(true);
        setSaveError('');
        try {
            const response = await fetch(`${url}/save`, {
                method: saved ? 'DELETE' : 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
            });
            if (!response.ok) throw new Error(response.status === 419 ? 'Session expired. Refresh and try again.' : 'Could not update saved post.');
            const result = await response.json() as { saved: boolean };
            onSavedChange(result.saved);
        } catch (reason) {
            setSaveError(reason instanceof Error ? reason.message : 'Could not update saved post.');
        } finally { setSaveBusy(false); }
    };
    return <div className="pm-engagement-shell"><EngagementActionBar>
        <ReactionPicker endpoint={`${url}/reactions`} initial={initial} total={total} canInteract={canInteract} onJoin={onJoin} onChanged={handleReactionChange} showCount={Boolean(buttonLabel)} buttonLabel={buttonLabel} prototypeIcon={prototypeIcon} />
        {inlineComments ? <button type="button" className="pm-home-action" aria-expanded={expanded} aria-controls={`inline-comments-${postId}`}
            onClick={() => { if (!canInteract) onJoin('comment on a discussion'); else toggleExpanded(); }}>
            <MessageCircle size={19} aria-hidden="true"/> {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button> : <HomeCommentAction label={commentCount === 1 ? 'comment' : 'comments'} count={commentCount} href={`${url}#post-comments`} canInteract={canInteract} onJoin={onJoin} />}
        <HomeShareAction href={url} canInteract={canInteract} onJoin={onJoin} />
        <PostReactionSummary postId={postId} total={summaryTotal} counts={summaryCounts}
            onRefresh={(count, counts) => { setSummaryTotal(count); setSummaryCounts(counts); }} />
        {showSave && <button type="button" className="pm-home-action pm-post-save-action" aria-pressed={saved} onClick={() => { void toggleSave(); }} disabled={saveBusy}>
            <Bookmark size={19} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" /> {saved ? 'Saved' : 'Save'}
        </button>}
        {saveError && <span className="pm-home-reaction-error" role="alert">{saveError}</span>}
    </EngagementActionBar>
        {inlineComments && expanded && <InlinePostComments postId={postId} canInteract={canInteract} onJoin={onJoin}
            onPosted={() => { setCommentCount(previous => previous + 1); onCommentAdded?.(); }} onClose={() => { openCommentPosts.delete(postId); setExpanded(false); }} />}
    </div>;
}
