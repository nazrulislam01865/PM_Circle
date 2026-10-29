import { Link } from '@inertiajs/react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { Avatar } from '@/components/pm/Avatar';

export type PostPreview = { id: number; title?: string | null; body: string; topic: string; published_at: string | null; ai_generated?: boolean; author: { name: string; profile?: { role?: string } | null }; comments_count: number; reactions_count: number };
export function PostCard({ post }: { post: PostPreview }) {
    return <article className="pm-post-preview"><div className="pm-post-author"><Avatar name={post.author.name} size={34} /><div><strong>{post.author.name}</strong><p>{post.author.profile?.role ? `${post.author.profile.role} · ${new Date(post.published_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : new Date(post.published_at ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div><span className="pm-topic-label">{post.topic}</span></div>
        <Link className="pm-post-text" href={`/posts/${post.id}`}>{post.title && <strong>{post.title}<br /></strong>}{post.body}</Link>
        {post.ai_generated && <span className="pm-ai-disclosure">AI-generated · editorially reviewed</span>}
        <div className="pm-post-actions"><Link href={`/posts/${post.id}`}><Heart size={16} /> {post.reactions_count}</Link><Link href={`/posts/${post.id}`}><MessageCircle size={16} /> {post.comments_count}</Link><button type="button" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/posts/${post.id}`)}><Share2 size={15} /> Share</button></div>
    </article>;
}
