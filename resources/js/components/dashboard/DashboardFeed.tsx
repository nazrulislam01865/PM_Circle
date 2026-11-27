import { router, usePage } from '@inertiajs/react';
import { AlertCircle, Heart } from 'lucide-react';
import { PostCheckCard, type PostCheckFeedData, type PostCheckPreview } from '@/components/community/PostCheckCard';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { FeedScopeTabs } from '@/components/community/FeedScopeTabs';
import type { DashboardFeedProps, DashboardPost, DashboardTab } from '@/types/dashboard';
import { VirtualizedFeed } from '@/components/community/VirtualizedFeed';
import { useSlidingFeed } from '@/hooks/community/useSlidingFeed';
import { useFeedScopeCounts } from '@/hooks/community/useFeedScopeCounts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Adapt the existing dashboard feed projection; no additional API or database requests. */
const samplePortraits: Record<string, string> = { 'Sara Ahmed': 'sara', 'Priya Nair': 'priya', 'Daniel Chen': 'daniel' };

function FeedItem({ post, demo, onReactionChange, onCommentAdded, onSavedChange, onHiddenChange, onRemoved, onUpdated, onMuteChange, onVoteChanged }: { post: DashboardPost; demo: boolean; onHiddenChange: (hidden: boolean) => void; onRemoved: () => void; onUpdated: (updated: { body: string; image_path: string | null; status?: string }) => void; onMuteChange: (muted: boolean) => void; onReactionChange: (reaction: DashboardPost['reaction'], count: number, counts: NonNullable<DashboardPost['reactionBreakdown']>) => void; onCommentAdded: () => void; onSavedChange: (saved: boolean) => void; onVoteChanged: (choice: number, options: NonNullable<DashboardPost['pollOptions']>) => void }) {
    const avatar = post.authorAvatar || (demo && samplePortraits[post.author]
        ? `/images/dashboard/${samplePortraits[post.author]}.webp` : null);
    const preview: PostPreview = {
        id: post.id, title: post.title, body: post.body, image_path: post.image_path,
        topic: post.topic, published_at: post.publishedAt,
        comments_count: post.comments, reactions_count: post.reactions, reaction_breakdown: post.reactionBreakdown,
        viewer_reaction: post.reaction, viewer_saved: post.saved, viewer_hidden: post.hidden,
        viewer_is_author: post.isOwner, viewer_muted: post.isMuted,
        is_anonymous: post.is_anonymous, visibility: post.visibility,
        poll_options: post.pollOptions, viewer_vote: post.viewerVote,
        author: { name: post.author, id: post.authorId ?? undefined, profile_url: post.authorProfileUrl ?? null, profile: post.authorHasPublicProfile || (demo && !post.authorId) ? { avatar_path: avatar, role: post.authorRole } : null },
    };
    return <PostCard post={preview} isGuest={false} onReactionChange={onReactionChange}
        onCommentAdded={onCommentAdded} onSavedChange={onSavedChange} onHiddenChange={onHiddenChange}
        onRemoved={onRemoved} onUpdated={onUpdated} onMuteChange={onMuteChange} onVoteChanged={onVoteChanged}/>;
}

export function DashboardFeed({ dashboard, progressive = false, submittingPost = null }: { dashboard: DashboardFeedProps; progressive?: boolean; submittingPost?: PostCheckPreview | null }) {
    const { url } = usePage();
    const communityView = new URLSearchParams(url.split('?')[1] ?? '').get('view') === 'community';
    const urlFor = (tab: DashboardTab) => `/dashboard?tab=${tab}${communityView ? '&view=community' : ''}${dashboard.isPreview ? `&demo_plan=${dashboard.plan}` : ''}`;
    const initial = useMemo(() => ({
        data: dashboard.posts,
        next_cursor: dashboard.feedPage.next_cursor,
        has_more: dashboard.feedPage.has_more,
        previous_cursor: dashboard.feedPage.previous_cursor,
    }), [dashboard.posts, dashboard.feedPage]);
    const feed = useSlidingFeed(initial, { tab: dashboard.feedTab, context: 'dashboard', viewerId: dashboard.member.id, bounded: dashboard.boundedFeedEnabled && dashboard.virtualFeedEnabled, estimateHeight: 280 });
    const { counts, updateSaved, updateHidden } = useFeedScopeCounts(dashboard.feedScopeCounts);
    const [postChecks, setPostChecks] = useState<PostCheckFeedData>(dashboard.postChecks);
    useEffect(() => setPostChecks(dashboard.postChecks), [dashboard.postChecks]);
    const hasPending = postChecks.posts.some(post => post.status === 'pending_check');
    const [newPostsAvailable, setNewPostsAvailable] = useState(false);
    const checkRequest = useRef<AbortController | null>(null);
    const checksRef = useRef(postChecks);
    checksRef.current = postChecks;
    const refreshCheckFeed = useCallback(async () => {
        if (checkRequest.current || document.visibilityState === 'hidden') return;
        const abort = new AbortController();
        checkRequest.current = abort;
        try {
            const response = await fetch('/posts/check-feed', { credentials: 'same-origin', signal: abort.signal, headers: { Accept: 'application/json' } });
            if (!response.ok || abort.signal.aborted) return;
            const data = await response.json() as PostCheckFeedData;
            if (abort.signal.aborted) return;
            const completed = checksRef.current.posts.some(post => post.status === 'pending_check' && !data.posts.some(next => next.id === post.id && next.status === 'pending_check'));
            checksRef.current = data;
            setPostChecks(data);
            if (completed) {
                if (progressive) setNewPostsAvailable(true);
                else router.reload({ only: ['dashboard'] });
            }
        } catch { /* Never expose unchecked content. */ }
        finally { if (checkRequest.current === abort) checkRequest.current = null; }
    }, [progressive]);
    useEffect(() => {
        if (!hasPending) return;
        let live = true;
        let timer: number;
        const schedule = () => { timer = window.setTimeout(async () => {
            await refreshCheckFeed();
            if (live) schedule();
        }, 6000 + Math.random() * 1000); };
        schedule();
        return () => { live = false; window.clearTimeout(timer); };
    }, [hasPending, refreshCheckFeed]);
    useEffect(() => () => { checkRequest.current?.abort(); checkRequest.current = null; }, []);
    const restricted = dashboard.feedTab === 'restricted';
    const blocked = Boolean(postChecks.blocked_until && new Date(postChecks.blocked_until).getTime() > Date.now());
    const restrictionPolicy = postChecks.restriction_policy;
    const ownPending = postChecks.posts.filter(post => restricted ? post.status === 'restricted'
        : (dashboard.feedTab === 'all' || dashboard.feedTab === 'mine') && post.status !== 'restricted');
    const visibleChecking = submittingPost && !restricted ? [submittingPost, ...ownPending] : ownPending;
    const visibleCounts = { ...counts, restricted: postChecks.restricted_count };
    return <section id="community-feed" className="pm-dash-feed-section" aria-label="Community feed"><div className="pm-dash-feed-sticky-controls">
        <div className="pm-dash-feed-heading"><h2>Community feed</h2></div>
        <div className="pm-dash-feed-tabs"><FeedScopeTabs active={dashboard.feedTab} counts={visibleCounts} showRestricted hrefFor={urlFor} only={progressive ? ['feed', 'postChecks', 'feedScopeCounts'] : undefined}/></div>
        {dashboard.boundedFeedEnabled && feed.error && <div className="pm-load-more-center" role="status"><span>{feed.error}</span><button type="button" className="pm-btn-load-more" onClick={feed.retry}>{feed.restart ? 'Refresh feed' : 'Retry loading posts'}</button></div>}
        </div>
        {progressive && newPostsAvailable && <div className="pm-load-more-center"><button type="button" className="pm-btn-load-more" onClick={() => {
            router.reload({ only: ['feed', 'postChecks', 'feedScopeCounts'], onSuccess: () => setNewPostsAvailable(false) });
        }}>Refresh discussions</button></div>}
        {(restricted || blocked) && <div className="pm-post-check-policy" role="status"><AlertCircle size={22}/><div>
            <strong>{blocked ? 'Your community posting is temporarily restricted' : 'Posting restriction policy'}</strong>
            <p>{restrictionPolicy.threshold} confirmed violations within {restrictionPolicy.window_days} days trigger a {restrictionPolicy.duration_days}-day posting restriction.</p>
            <small>Confirmed violations in the last {restrictionPolicy.window_days} days: {postChecks.violation_count}.</small>
            <small>Posting, commenting and replying are paused while a restriction is active.</small>
            {blocked && <small className="pm-post-check-expiry">Restriction ends {new Date(postChecks.blocked_until!).toLocaleString()}.</small>}
        </div></div>}
        {visibleChecking.length > 0 && <div className="pm-dash-posts">{visibleChecking.map(post => <PostCheckCard key={post.id} post={post}
            owner={dashboard.member} blockedUntil={postChecks.blocked_until} onRefresh={() => { void refreshCheckFeed(); }} />)}</div>}
        {!restricted && feed.hasPrevious && <div className="pm-load-more-center"><button type="button" className="pm-btn-load-more" disabled={feed.loading || Boolean(feed.error)} onClick={feed.loadPrevious}>Load earlier discussions</button></div>}
        {!restricted && feed.items.length ? <VirtualizedFeed items={feed.items} className="pm-dash-posts"
            estimateHeight={280} onNearEnd={feed.loadMore} onNearStart={feed.hasPrevious ? feed.loadPrevious : undefined}
            topPx={feed.topPx} bottomPx={feed.bottomPx} anchor={feed.anchor} viewport={dashboard.boundedFeedEnabled && dashboard.virtualFeedEnabled ? feed.viewport : undefined} enabled={dashboard.virtualFeedEnabled}
            renderItem={post => <FeedItem post={post} demo={dashboard.isDemo}
                onReactionChange={(reaction, count, counts) => feed.updateItem(post.id, { reaction, reactions: count, reactionBreakdown: counts })}
                onCommentAdded={() => feed.updateItem(post.id, current => ({ comments: current.comments + 1 }))}
                onSavedChange={saved => {
                    updateSaved(post.saved, saved, Boolean(post.hidden));
                    if (dashboard.feedTab === 'saved' && !saved) {
                        feed.removeItem(post.id);
                        if (counts.saved <= 1) router.visit(urlFor('all'), { preserveScroll: true });
                    } else feed.updateItem(post.id, { saved });
                }}
                onHiddenChange={hidden => {
                    updateHidden(Boolean(post.hidden), hidden, post.saved);
                    feed.removeItem(post.id);
                    if (dashboard.feedTab === 'hidden' && !hidden && counts.hidden <= 1) router.visit(urlFor('all'), { preserveScroll: true });
                }}
                onRemoved={() => {
                    if (post.hidden) updateHidden(true, false, post.saved);
                    else if (post.saved) updateSaved(true, false, false);
                    feed.removeItem(post.id);
                }} onUpdated={updated => {
                    if (updated.status && updated.status !== 'published') { feed.removeItem(post.id); void refreshCheckFeed(); }
                    else feed.updateItem(post.id, { body: updated.body, image_path: updated.image_path });
                }}
                onMuteChange={muted => feed.updateItem(post.id, { isMuted: muted })} onVoteChanged={(choice, options) => feed.updateItem(post.id, { viewerVote: choice, pollOptions: options })} />} />
            : !restricted && visibleChecking.length === 0 ? <div className="pm-dash-posts"><div className="pm-dash-card pm-dash-empty"><Heart size={24}/><h3>{dashboard.feedTab === 'following' ? 'No posts from your connections yet' : dashboard.feedTab === 'mine' ? 'You have not posted yet' : dashboard.feedTab === 'saved' ? 'No saved posts yet' : dashboard.feedTab === 'hidden' ? 'No hidden posts' : 'No discussions yet'}</h3><p>{dashboard.feedTab === 'following' ? 'Follow members or connect with your followers to see their posts.' : dashboard.feedTab === 'mine' ? 'Share something with the community to see it here.' : dashboard.feedTab === 'saved' ? 'Save a post to revisit it here.' : dashboard.feedTab === 'hidden' ? 'Hidden posts can be restored using their post menu.' : 'Share an update or question using the composer above.'}</p></div></div> : null}
        {!restricted && (feed.hasMore || feed.loading || feed.error) && <div className="pm-load-more-center" aria-live="polite">
            {feed.error ? dashboard.boundedFeedEnabled ? null : <><span role="status">{feed.error}</span><button type="button" className="pm-btn-load-more" onClick={feed.retry}>{feed.restart ? "Refresh feed" : "Retry loading posts"}</button></>
                : feed.loading ? <span className="helper" role="status">Loading discussions…</span>
                    : <button type="button" className="pm-btn-load-more" onClick={feed.loadMore}>Load more discussions</button>}
        </div>}
    </section>;
}
