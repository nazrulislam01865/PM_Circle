import { LegacyPageHeading } from '@/components/pm/PublicPageBanner';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, LockKeyhole, Users } from 'lucide-react';
import { JoinCommunityDialog } from '@/components/home/HomeEngagement';
import { useState } from 'react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { CommunityComment, type CommunityCommentData } from '@/components/community/CommunityComment';
import { CommentComposer, type SavedComment } from '@/components/community/CommentComposer';
import { postAuthorHref, postAuthorUnavailable } from '@/components/community/PostAuthorLinks';
import { PostSidebar } from '@/components/community/PostSidebar';
import { PostCard, type PostPreview } from '@/components/community/PostCard';

type Post = PostPreview & { reactions_count: number; likes_count: number; loves_count: number; author: { name: string; id?: number; profile?: { role?: string; avatar_path?: string | null } | null } };
type Related = { id: number; title?: string | null; body: string; comments_count: number };
type Props = {
    post: Post;
    comments: { data: CommunityCommentData[]; next_page_url: string | null; refresh_relevant?: boolean };
    commentSort?: 'relevant' | 'newest';
    viewerReaction: string | null; viewerSaved: boolean;
    viewerLikedCommentIds: number[]; viewerCommentReactions?: Record<number, import('@/components/home/HomeEngagement').ReactionType>; showDemoContent: boolean; relatedPosts: Related[];
};
export default function PostShow({ post, comments, viewerReaction, viewerSaved, commentSort = 'relevant', viewerLikedCommentIds = [], viewerCommentReactions = {}, showDemoContent, relatedPosts = [] }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ emailVerificationRequired: boolean; auth: { user: { name: string; avatar_path?: string | null; email_verified_at: string | null; onboarding_step: number } | null } }>().props;
    const canInteract = Boolean(auth?.user && (!emailVerificationRequired || auth.user.email_verified_at) && auth.user.onboarding_step >= 3);
    const [newComments, setNewComments] = useState<CommunityCommentData[]>([]);
    const [commentCount, setCommentCount] = useState(post.comments_count);
    const viewer = { name: auth?.user?.name ?? 'Community member', avatar_path: auth?.user?.avatar_path };
    const addComment = (saved: SavedComment) => {
        setNewComments(previous => [{ ...saved, author: { name: saved.author.name, profile_url: saved.author.profile_url ?? null, profile: { avatar_path: saved.author.avatar_path } }, replies: [] }, ...previous.filter(item => item.id !== saved.id)]);
        setCommentCount(previous => saved.post_comments_count ?? previous + 1);
    };
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const commentsShown = [...newComments, ...comments.data.filter(item => !newComments.some(local => local.id === item.id))];
    return <PublicLayout active="/community" joinLabel="Join the Circle" banner={{title: post.title || 'Community discussion', parents: [{label: 'Community', href: '/community'}], currentLabel: 'Member post'}}><Head title={post.title || 'Community discussion'}/>
        <div className="pm-container pm-page pm-member-post-page"><LegacyPageHeading><div className="pm-crumbs">Community &nbsp;/&nbsp; Member post</div></LegacyPageHeading><Link className="pm-back" href="/community">← &nbsp;Back to community</Link>
            <div className="pm-two-column"><div className="pm-stack">
                <PostCard post={{ ...post, comments_count: commentCount, viewer_reaction: viewerReaction as PostPreview['viewer_reaction'], viewer_saved: viewerSaved }}
                    mode="detail" isGuest={!canInteract} onJoin={setJoinAction}
                    onRemoved={() => router.visit('/community')}
                    onUpdated={() => router.reload({ only: ['post'] })}/>
                <section className="pm-panel pm-post-comments-panel" id="post-comments"><div className="pm-post-comments-heading"><h2>Comments ({commentCount})</h2></div>
                    <CommentComposer postId={post.id} avatarName={viewer.name} avatarSrc={viewer.avatar_path}
                        canInteract={canInteract} onJoin={setJoinAction} onCreated={addComment}/>
                    {!canInteract && <div className="pm-post-composer-footer"><span><LockKeyhole size={14}/>Log in or join to comment and reply.</span><div><Link href="/login" className="pm-button pm-button-outline pm-button-sm">Log in</Link><Link href="/register" className="pm-button pm-button-sm">Join free</Link></div></div>}
                    <div className="pm-post-comments-sort-row"><label className="pm-inline-sort-control" htmlFor="pm-post-detail-sort">
                        <span className="sr-only">Sort comments</span><select id="pm-post-detail-sort" value={commentSort} onChange={e => router.get(`/posts/${post.id}`, { sort: e.target.value }, { preserveScroll: true })}>
                            <option value="relevant">Most relevant</option><option value="newest">Newest first</option>
                        </select><ChevronDown size={18} aria-hidden="true"/>
                    </label></div>
                    {commentsShown.map(comment => <CommunityComment key={comment.id} comment={comment} postId={post.id} postAuthor={post.author.name} canInteract={canInteract} likedIds={viewerLikedCommentIds} viewerReactions={viewerCommentReactions} demo={showDemoContent} viewer={viewer} onCommentAdded={count => setCommentCount(previous => count ?? previous + 1)}/>) }
                    {!commentsShown.length && <p className="pm-empty">No comments yet. Start the conversation.</p>}
                    {comments.refresh_relevant && <div className="pm-pager"><Link href={`/posts/${post.id}?sort=relevant`}>Refresh relevant comments</Link></div>}
                    {comments.next_page_url && <div className="pm-pager"><Link href={comments.next_page_url}>Load more comments⌄</Link></div>}
                </section>
            </div><PostSidebar unavailable={postAuthorUnavailable(post)} name={post.author.name} authorHref={postAuthorHref(post)} avatar={post.author.profile?.avatar_path} role={post.author.profile?.role} demo={showDemoContent} loggedIn={canInteract} relatedPosts={relatedPosts}/></div>
            <div className="pm-post-bottom-banner"><Users size={42}/><div><strong>Your experience could help another project manager.</strong><p>Join PM Circle to share your ideas, ask questions and learn from a global community.</p></div><Link className="pm-button" href={canInteract ? '/community' : '/register'}>{canInteract ? 'Back to community' : 'Join the Circle — it’s free'} →</Link></div>
        </div>
        <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)} />
    </PublicLayout>;
}
