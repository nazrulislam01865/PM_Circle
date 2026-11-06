import { Link, router } from '@inertiajs/react';
import { ChevronRight, Ellipsis, Heart } from 'lucide-react';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { PostContent } from '@/components/community/PostContent';
import { FeedScopeTabs } from '@/components/community/FeedScopeTabs';
import type { DashboardData, DashboardPost, DashboardTab } from '@/types/dashboard';

function FeedItem({ post, demo }: { post: DashboardPost; demo: boolean }) {
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
                comments={post.comments} canInteract={true} onJoin={onJoin} showSave saved={post.saved} />
        </div>
    </article>;
}

export function DashboardFeed({ dashboard }: { dashboard: DashboardData }) {
    const urlFor = (tab: DashboardTab) => `/dashboard?tab=${tab}${dashboard.isPreview ? `&demo_plan=${dashboard.plan}` : ''}`;
    return <section className="pm-dash-feed-section" aria-label="Community feed"><div className="pm-dash-feed-heading"><h2>Community feed</h2></div>
        <div className="pm-dash-feed-tabs"><FeedScopeTabs active={dashboard.feedTab} hrefFor={urlFor}/><Link href={`/community?tab=${dashboard.feedTab}`} className="pm-dash-view-all">View all <ChevronRight size={22}/></Link></div>
        <div className="pm-dash-posts">{dashboard.posts.length ? dashboard.posts.map(post => <FeedItem key={post.id} post={post} demo={dashboard.isDemo}/>) : <div className="pm-dash-card pm-dash-empty"><Heart size={24}/><h3>{dashboard.feedTab === 'following' ? 'No posts from your connections yet' : dashboard.feedTab === 'mine' ? 'You have not posted yet' : 'No discussions yet'}</h3><p>{dashboard.feedTab === 'following' ? 'Follow members or connect with your followers to see their posts.' : dashboard.feedTab === 'mine' ? 'Share something with the community to see it here.' : 'Visit the community and start a conversation.'}</p><Link className="pm-dash-btn pm-dash-btn-primary" href="/community">Explore community</Link></div>}</div>
    </section>;
}
