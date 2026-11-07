import { Link, router } from '@inertiajs/react';
import { ArrowUp, Ellipsis, Heart } from 'lucide-react';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { PostContent } from '@/components/community/PostContent';
import { FeedScopeTabs } from '@/components/community/FeedScopeTabs';
import type { DashboardData, DashboardPost, DashboardTab } from '@/types/dashboard';
import { VirtualizedFeed } from '@/components/community/VirtualizedFeed';
import { useSlidingFeed } from '@/hooks/community/useSlidingFeed';
import { useMemo } from 'react';

function FeedItem({ post, demo, onReactionChange, onCommentAdded, onSavedChange }: { post: DashboardPost; demo: boolean; onReactionChange: (reaction: DashboardPost['reaction'], count: number) => void; onCommentAdded: () => void; onSavedChange: (saved: boolean) => void }) {
    const link = `/posts/${post.id}`;
    const onJoin = () => router.visit('/dashboard');
    const dateLabel = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently';
    return <article className="pm-dash-card pm-dash-feed-card">
        <div className="pm-dash-feed-author"><DashboardAvatar name={post.author} size={58} demo={demo} src={post.authorAvatar}/><div className="pm-dash-feed-author-text"><div><strong>{post.author}</strong><span>{post.authorRole || 'Community member'}</span></div><small>{dateLabel} · {post.topic === 'I learned' ? 'Lesson' : 'Question'}</small></div>
            <Link href={link} aria-label={`Open post by ${post.author}`} className="pm-dash-more"><Ellipsis size={23}/></Link></div>
        {post.title && <Link href={link} className="pm-dash-feed-title">{post.title}</Link>}
        <PostContent className="pm-dash-feed-body" body={post.body} image={post.image_path} />
        <div className="pm-dash-feed-actions">
            <PostEngagementActions postId={post.id} initial={post.reaction} total={post.reactions}
                comments={post.comments} canInteract={true} onJoin={onJoin} showSave saved={post.saved}
                onReactionChange={onReactionChange} onCommentAdded={onCommentAdded} onSavedChange={onSavedChange} />
        </div>
    </article>;
}

export function DashboardFeed({ dashboard }: { dashboard: DashboardData }) {
    const urlFor = (tab: DashboardTab) => `/dashboard?tab=${tab}${dashboard.isPreview ? `&demo_plan=${dashboard.plan}` : ''}`;
    const initial = useMemo(() => ({
        data: dashboard.posts,
        next_cursor: dashboard.feedPage.next_cursor,
        has_more: dashboard.feedPage.has_more,
    }), [dashboard.posts, dashboard.feedPage]);
    const feed = useSlidingFeed(initial, { tab: dashboard.feedTab, context: 'dashboard', viewerId: dashboard.member.id });
    return <section className="pm-dash-feed-section" aria-label="Community feed"><div className="pm-dash-feed-sticky-controls">
        <div className="pm-dash-feed-heading"><h2>Community feed</h2><button type="button" className="pm-dash-feed-to-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}><ArrowUp size={16} aria-hidden="true"/>Back to top</button></div>
        <div className="pm-dash-feed-tabs"><FeedScopeTabs active={dashboard.feedTab} hrefFor={urlFor}/></div>
        </div>
        {feed.items.length ? <VirtualizedFeed items={feed.items} className="pm-dash-posts"
            estimateHeight={280} onNearEnd={feed.loadMore} enabled={dashboard.virtualFeedEnabled}
            renderItem={post => <FeedItem post={post} demo={dashboard.isDemo}
                onReactionChange={(reaction, count) => feed.updateItem(post.id, { reaction, reactions: count })}
                onCommentAdded={() => feed.updateItem(post.id, { comments: post.comments + 1 })}
                onSavedChange={saved => feed.updateItem(post.id, { saved })} />} />
            : <div className="pm-dash-posts"><div className="pm-dash-card pm-dash-empty"><Heart size={24}/><h3>{dashboard.feedTab === 'following' ? 'No posts from your connections yet' : dashboard.feedTab === 'mine' ? 'You have not posted yet' : 'No discussions yet'}</h3><p>{dashboard.feedTab === 'following' ? 'Follow members or connect with your followers to see their posts.' : dashboard.feedTab === 'mine' ? 'Share something with the community to see it here.' : 'Share an update or question using the composer above.'}</p></div></div>}
        {(feed.hasMore || feed.loading || feed.error) && <div className="pm-load-more-center" aria-live="polite">
            {feed.error ? <button type="button" className="pm-btn-load-more" onClick={feed.retry}>Retry loading posts</button>
                : feed.loading ? <span className="helper" role="status">Loading discussions…</span>
                    : <button type="button" className="pm-btn-load-more" onClick={feed.loadMore}>Load more discussions</button>}
        </div>}
    </section>;
}
