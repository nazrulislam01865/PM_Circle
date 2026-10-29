import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { MessageCircle, Users } from 'lucide-react';
import { PublicLayout } from '@/layouts/pm/PublicLayout';
import { PostCard, type PostPreview } from '@/components/community/PostCard';
import { TopicPills } from '@/components/community/TopicPills';

type Props = { posts: { data: PostPreview[]; next_page_url: string | null; prev_page_url: string | null }; activeTopic: string; search?: string | null };
function Composer() {
    const { data, setData, post, processing, errors, reset } = useForm({ body: '', topic: 'From my project' });
    return <form className="pm-panel pm-feed-composer" onSubmit={e => { e.preventDefault(); post('/posts', { onSuccess: () => reset() }); }}>
        <label htmlFor="community-post">Share what you learned with the community</label><textarea id="community-post" value={data.body} maxLength={5000} onChange={e => setData('body', e.target.value)} placeholder="Share a practical lesson, ask a question or describe a project experience..." required />
        {errors.body && <p className="pm-error" role="alert">{errors.body}</p>}
        <div><select value={data.topic} aria-label="Post topic" onChange={e => setData('topic', e.target.value)}><option>I learned</option><option>From my project</option><option>Ask the community</option></select><button type="submit" className="pm-button pm-button-sm" disabled={processing}>Publish post</button></div>
    </form>;
}
export default function Feed({ posts, activeTopic, search }: Props) {
    const { auth, emailVerificationRequired } = usePage<{ emailVerificationRequired: boolean; auth: { user: { onboarding_step: number; email_verified_at: string | null } | null } }>().props;
    const canPost = Boolean(auth?.user && (!emailVerificationRequired || auth.user.email_verified_at) && auth.user.onboarding_step >= 3);
    return <PublicLayout active="/community"><Head title="Community discussions"/><div className="pm-container pm-page"><div className="pm-crumbs">Home / Discussions</div><h1 className="pm-feed-title">{search ? `Results for “${search}”` : "Conversations from the circle"}</h1>
        <div className="pm-two-column"><div><TopicPills active={activeTopic} />{canPost ? <Composer/> : <div className="pm-panel pm-feed-composer"><strong>Have a lesson worth sharing?</strong><p className="pm-empty">Join the circle to post, respond and learn with other professionals.</p><Link href="/register" className="pm-button pm-button-sm">Join the community — free</Link></div>}
        <section className="pm-panel pm-community-panel">{posts.data.length ? posts.data.map(p => <PostCard key={p.id} post={p}/>) : <p className="pm-empty">No discussions in this category yet. Start the first conversation.</p>}</section>
        <nav className="pm-pager">{posts.prev_page_url && <Link href={posts.prev_page_url}>Previous</Link>}{posts.next_page_url && <Link href={posts.next_page_url}>Load more discussions</Link>}</nav></div>
        <aside className="pm-stack"><section className="pm-sidebar-detail pm-panel"><Users color="var(--pm-primary)" size={30}/><h3>Real conversations. Useful insights.</h3><p>Exchange practical lessons, ask project management questions and build relationships with people who understand your work.</p></section><section className="pm-sidebar-detail pm-panel"><MessageCircle color="var(--pm-primary)" size={27}/><h3>Today's scenario</h3><p>Try a situation with no perfect answer, and compare approaches from the community.</p><Link className="pm-text-link" href="/">See latest scenario →</Link></section></aside></div></div></PublicLayout>;
}
