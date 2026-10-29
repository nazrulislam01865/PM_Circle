import { Link, router } from '@inertiajs/react';
import { Bookmark, ChevronRight, Ellipsis, Hand, Heart, MessageSquare, Share2, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import type { DashboardData, DashboardPost, DashboardTab } from '@/types/dashboard';

function FeedItem({ post, demo }: { post: DashboardPost; demo: boolean }) {
    const link = `/posts/${post.id}`;
    const isPriya = post.author === 'Priya Nair';
    const isDaniel = post.author === 'Daniel Chen';
    const counts = demo ? { likes: isPriya ? 48 : isDaniel ? 36 : post.likes, claps: isPriya ? 27 : isDaniel ? 18 : post.claps, comments: isPriya ? 12 : isDaniel ? 22 : post.comments, shares: isPriya ? 6 : isDaniel ? 4 : post.shares } : post;
    function react(type: 'like' | 'love') {
        if (post.reaction === type) router.delete(`${link}/reactions`, { preserveScroll: true });
        else router.post(`${link}/reactions`, { type }, { preserveScroll: true });
    }
    function toggleSave() {
        if (post.saved) router.delete(`${link}/save`, { preserveScroll: true });
        else router.post(`${link}/save`, {}, { preserveScroll: true });
    }
    async function share() {
        try { await navigator.clipboard.writeText(new URL(link, window.location.origin).href); toast.success('Post link copied'); }
        catch { toast.error('Could not copy link. Open the post to share.'); }
    }
    return <article className="pm-dash-card pm-dash-feed-card">
        <div className="pm-dash-feed-author"><DashboardAvatar name={post.author} size={58} demo={demo}/><div className="pm-dash-feed-author-text"><div><strong>{post.author}</strong><span>{isPriya ? 'Instructor' : 'Community member'}</span></div><small>{demo ? (isPriya ? '2 days ago' : isDaniel ? '1 day ago' : 'Recently') : post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US',{ month:'short',day:'numeric' }) : 'Recently'} · {post.topic === 'I learned' ? 'Lesson' : 'Question'}</small></div>
            <Link href={link} aria-label={`Open post by ${post.author}`} className="pm-dash-more"><Ellipsis size={23}/></Link></div>
        <Link href={link} className="pm-dash-feed-title">{post.title || 'From the community'}</Link>
        <p className="pm-dash-feed-body">{post.body}</p>
        <div className="pm-dash-feed-actions">
            <button type="button" aria-pressed={post.reaction === 'like'} onClick={() => react('like')}><ThumbsUp size={22}/> Like <span>{counts.likes}</span></button>
            <button type="button" aria-pressed={post.reaction === 'love'} onClick={() => react('love')} title="Appreciate (Love reaction)"><Hand size={22}/> Clap <span>{counts.claps}</span></button>
            <Link href={`${link}#post-comments`}><MessageSquare size={22}/> Comment <span>{counts.comments}</span></Link>
            <button type="button" onClick={() => void share()}><Share2 size={22}/> Share <span>{counts.shares || ''}</span></button>
            <button type="button" className="pm-dash-save" aria-pressed={post.saved} onClick={toggleSave}><Bookmark size={22} fill={post.saved ? 'currentColor' : 'none'}/>{post.saved ? 'Saved' : 'Save'}</button>
        </div>
    </article>;
}

export function DashboardFeed({ dashboard }: { dashboard: DashboardData }) {
    const urlFor = (tab: DashboardTab) => `/dashboard?tab=${tab}${dashboard.isPreview ? `&demo_plan=${dashboard.plan}` : ''}`;
    return <section className="pm-dash-feed-section" aria-label="Community feed"><div className="pm-dash-feed-heading"><h2>Community feed</h2></div>
        <div className="pm-dash-feed-tabs"><div role="tablist" aria-label="Feed view"><Link href={urlFor('for-you')} role="tab" aria-selected={dashboard.feedTab === 'for-you'} className={dashboard.feedTab === 'for-you' ? 'active' : ''}>For you</Link><Link href={urlFor('following')} role="tab" aria-selected={dashboard.feedTab === 'following'} className={dashboard.feedTab === 'following' ? 'active' : ''}>Following</Link></div><Link href="/community" className="pm-dash-view-all">View all <ChevronRight size={22}/></Link></div>
        <div className="pm-dash-posts">{dashboard.posts.length ? dashboard.posts.map(post => <FeedItem key={post.id} post={post} demo={dashboard.isDemo}/>) : <div className="pm-dash-card pm-dash-empty"><Heart size={24}/><h3>{dashboard.feedTab === 'following' ? 'No followed discussions yet' : 'No discussions yet'}</h3><p>{dashboard.feedTab === 'following' ? 'Followed-member feeds will appear when following is available.' : 'Visit the community and start a conversation.'}</p><Link className="pm-dash-btn pm-dash-btn-primary" href="/community">Explore community</Link></div>}</div>
    </section>;
}
