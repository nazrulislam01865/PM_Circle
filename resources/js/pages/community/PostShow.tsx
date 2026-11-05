import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { LockKeyhole, Users } from 'lucide-react';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import { JoinCommunityDialog, type ReactionType } from '@/components/home/HomeEngagement';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { CommunityComment, type CommunityCommentData } from '@/components/community/CommunityComment';
import { PostSidebar } from '@/components/community/PostSidebar';
import type { PostPreview } from '@/components/community/PostCard';

type Post = PostPreview & { reactions_count: number; likes_count: number; loves_count: number; author: { name: string; profile?: { role?: string; avatar_path?: string | null } | null } };
type Related = { id: number; title?: string | null; body: string; comments_count: number };
type Props = {
    post: Post;
    comments: { data: CommunityCommentData[]; next_page_url: string | null };
    viewerReaction: string | null; viewerSaved: boolean;
    viewerLikedCommentIds: number[]; showDemoContent: boolean; relatedPosts: Related[];
};
export default function PostShow({ post, comments, viewerReaction, viewerSaved, viewerLikedCommentIds = [], showDemoContent, relatedPosts = [] }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ emailVerificationRequired: boolean; auth: { user: { email_verified_at: string | null; onboarding_step: number } | null } }>().props;
    const canInteract = Boolean(auth?.user && (!emailVerificationRequired || auth.user.email_verified_at) && auth.user.onboarding_step >= 3);
    const form = useForm({ body: '' });
    const [sort, setSort] = useState('relevant');
    const [joinAction, setJoinAction] = useState<string | null>(null);
    const act = (path: string, method: 'post' | 'delete', payload?: Record<string, string>) => {
        if (!canInteract) { router.visit('/login'); return; }
        if (method === 'post') router.post(path, payload ?? {}, { preserveScroll: true });
        else router.delete(path, { preserveScroll: true });
    };
    const commentsShown = [...comments.data].sort((a, b) => sort === 'newest' ? b.id - a.id : a.id - b.id);
    return <PublicLayout active="/community" joinLabel="Join the Circle"><Head title={post.title || 'Community discussion'}/>
        <div className="pm-container pm-page pm-member-post-page"><div className="pm-crumbs">Community &nbsp;/&nbsp; Member post</div><Link className="pm-back" href="/community">← &nbsp;Back to community</Link>
            <div className="pm-two-column"><div className="pm-stack">
                <article className="pm-panel pm-content-panel pm-member-post"><div className="pm-post-author pm-post-author-large"><Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={49}/><div><strong>{post.author.name}</strong><p>{post.author.profile?.role || 'Community member'} &nbsp;·&nbsp; {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Recently'}</p></div><span className="pm-thread-menu" aria-hidden="true">···</span></div>
                    <div className="pm-post-category"><span>{post.topic}</span></div>
                    {post.title && <h1>{post.title}</h1>}<p className="pm-post-body">{post.body}</p>
                    <div className="pm-tags"><span>{post.topic}</span></div>
                    {post.ai_generated && <p className="pm-ai-disclosure">AI-generated · editorially reviewed</p>}
                    <div className="pm-member-post-actions">
                        <PostEngagementActions postId={post.id} initial={viewerReaction as ReactionType | null}
                            total={post.reactions_count ?? 0} comments={post.comments_count} canInteract={canInteract}
                            onJoin={setJoinAction} showSave saved={viewerSaved} inlineComments={false} />
                    </div>
                </article>
                <section className="pm-panel pm-post-comments-panel" id="post-comments"><div className="pm-post-comments-heading"><h2>Comments ({post.comments_count})</h2><select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort comments"><option value="relevant">Most relevant</option><option value="newest">Newest first</option></select></div>
                    <form className="pm-post-composer" onSubmit={e => { e.preventDefault(); if (!canInteract) { router.visit('/login'); return; } form.post(`/posts/${post.id}/comments`, { preserveScroll: true, onSuccess: () => form.reset() }); }}>
                        <div className="pm-post-composer-top"><Avatar name={auth?.user ? 'You' : 'Community member'} size={44}/><textarea aria-label="Share your experience" value={form.data.body} onChange={e => form.setData('body', e.target.value)} placeholder="Share your experience or ask a question..." readOnly={!canInteract} onClick={() => { if (!canInteract) setJoinAction('comment on this post'); }} minLength={2} maxLength={3000}/></div>
                        {form.errors.body && <p role="alert" className="pm-error">{form.errors.body}</p>}
                        {canInteract ? <button type="submit" className="pm-button pm-button-sm" disabled={form.processing}>Post comment</button> : <div className="pm-post-composer-footer"><span><LockKeyhole size={14}/>Log in or join to comment and reply.</span><div><Link href="/login" className="pm-button pm-button-outline pm-button-sm">Log in</Link><Link href="/register" className="pm-button pm-button-sm">Join free</Link></div></div>}
                    </form>
                    {commentsShown.map(comment => <CommunityComment key={comment.id} comment={comment} postId={post.id} postAuthor={post.author.name} canInteract={canInteract} likedIds={viewerLikedCommentIds} demo={showDemoContent}/>) }
                    {!commentsShown.length && <p className="pm-empty">No comments yet. Start the conversation.</p>}
                    {comments.next_page_url && <div className="pm-pager"><Link href={comments.next_page_url}>Load more comments⌄</Link></div>}
                </section>
            </div><PostSidebar name={post.author.name} role={post.author.profile?.role} demo={showDemoContent} loggedIn={canInteract} relatedPosts={relatedPosts}/></div>
            <div className="pm-post-bottom-banner"><Users size={42}/><div><strong>Your experience could help another project manager.</strong><p>Join PM Circle to share your ideas, ask questions and learn from a global community.</p></div><Link className="pm-button" href={canInteract ? '/community' : '/register'}>{canInteract ? 'Back to community' : 'Join the Circle — it’s free'} →</Link></div>
        </div>
        <JoinCommunityDialog action={joinAction} onClose={() => setJoinAction(null)} hasAccount={Boolean(auth?.user)} />
    </PublicLayout>;
}
