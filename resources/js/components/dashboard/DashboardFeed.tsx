import { Heart } from 'lucide-react';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { FeedScopeTabs } from '@/components/community/FeedScopeTabs';
import type { DashboardData, DashboardPost, DashboardTab } from '@/types/dashboard';
import { VirtualizedFeed } from '@/components/community/VirtualizedFeed';
import { useSlidingFeed } from '@/hooks/community/useSlidingFeed';
import { useMemo } from 'react';

/** Adapt the existing dashboard feed projection; no additional API or database requests. */
const samplePortraits: Record<string, string> = { 'Sara Ahmed': 'sara', 'Priya Nair': 'priya', 'Daniel Chen': 'daniel' };

function FeedItem({ post, demo, onReactionChange, onCommentAdded, onSavedChange, onRemoved, onUpdated, onMuteChange }: { post: DashboardPost; demo: boolean; onRemoved: () => void; onUpdated: (updated: { body: string; image_path: string | null }) => void; onMuteChange: (muted: boolean) => void; onReactionChange: (reaction: DashboardPost['reaction'], count: number) => void; onCommentAdded: () => void; onSavedChange: (saved: boolean) => void }) {
    const avatar = post.authorAvatar || (demo && samplePortraits[post.author]
        ? `/images/dashboard/${samplePortraits[post.author]}.webp` : null);
    const preview: PostPreview = {
        id: post.id, title: post.title, body: post.body, image_path: post.image_path,
        topic: post.topic, published_at: post.publishedAt,
        comments_count: post.comments, reactions_count: post.reactions,
        viewer_reaction: post.reaction, viewer_saved: post.saved,
        viewer_is_author: post.isOwner, viewer_muted: post.isMuted,
        is_anonymous: post.is_anonymous, visibility: post.visibility,
        poll_options: post.pollOptions, viewer_vote: post.viewerVote,
        author: { name: post.author, profile: { avatar_path: avatar } },
    };
    return <PostCard post={preview} isGuest={false} onReactionChange={onReactionChange}
        onCommentAdded={onCommentAdded} onSavedChange={onSavedChange}
        onRemoved={onRemoved} onUpdated={onUpdated} onMuteChange={onMuteChange}/>;
}

export function DashboardFeed({ dashboard }: { dashboard: DashboardData }) {
    const urlFor = (tab: DashboardTab) => `/dashboard?tab=${tab}${dashboard.isPreview ? `&demo_plan=${dashboard.plan}` : ''}`;
    const initial = useMemo(() => ({
        data: dashboard.posts,
        next_cursor: dashboard.feedPage.next_cursor,
        has_more: dashboard.feedPage.has_more,
    }), [dashboard.posts, dashboard.feedPage]);
    const feed = useSlidingFeed(initial, { tab: dashboard.feedTab, context: 'dashboard', viewerId: dashboard.member.id });
    return <section id="community-feed" className="pm-dash-feed-section" aria-label="Community feed"><div className="pm-dash-feed-sticky-controls">
        <div className="pm-dash-feed-heading"><h2>Community feed</h2></div>
        <div className="pm-dash-feed-tabs"><FeedScopeTabs active={dashboard.feedTab} hrefFor={urlFor}/></div>
        </div>
        {feed.items.length ? <VirtualizedFeed items={feed.items} className="pm-dash-posts"
            estimateHeight={280} onNearEnd={feed.loadMore} enabled={dashboard.virtualFeedEnabled}
            renderItem={post => <FeedItem post={post} demo={dashboard.isDemo}
                onReactionChange={(reaction, count) => feed.updateItem(post.id, { reaction, reactions: count })}
                onCommentAdded={() => feed.updateItem(post.id, { comments: post.comments + 1 })}
                onSavedChange={saved => feed.updateItem(post.id, { saved })}
                onRemoved={() => feed.removeItem(post.id)} onUpdated={updated => feed.updateItem(post.id, updated)}
                onMuteChange={muted => feed.updateItem(post.id, { isMuted: muted })} />} />
            : <div className="pm-dash-posts"><div className="pm-dash-card pm-dash-empty"><Heart size={24}/><h3>{dashboard.feedTab === 'following' ? 'No posts from your connections yet' : dashboard.feedTab === 'mine' ? 'You have not posted yet' : 'No discussions yet'}</h3><p>{dashboard.feedTab === 'following' ? 'Follow members or connect with your followers to see their posts.' : dashboard.feedTab === 'mine' ? 'Share something with the community to see it here.' : 'Share an update or question using the composer above.'}</p></div></div>}
        {(feed.hasMore || feed.loading || feed.error) && <div className="pm-load-more-center" aria-live="polite">
            {feed.error ? <button type="button" className="pm-btn-load-more" onClick={feed.retry}>Retry loading posts</button>
                : feed.loading ? <span className="helper" role="status">Loading discussions…</span>
                    : <button type="button" className="pm-btn-load-more" onClick={feed.loadMore}>Load more discussions</button>}
        </div>}
    </section>;
}
