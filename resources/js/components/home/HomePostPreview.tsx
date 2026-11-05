import { Link } from '@inertiajs/react';
import { Avatar } from '@/components/pm/Avatar';
import type { ReactionType, RequestToJoin } from './HomeEngagement';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';

export type HomePost = {
    id: number; body: string; title?: string | null; topic: string;
    likes_count: number; reactions_count?: number; viewer_reaction?: ReactionType | null;
    comments_count: number; ai_generated?: boolean; published_at: string | null;
    author: { name: string; profile?: { role?: string | null; avatar_path?: string | null } | null };
};

export function HomePostPreview({ post, canInteract, onJoin }: {
    post: HomePost; canInteract: boolean; onJoin: RequestToJoin;
}) {
    const link = `/posts/${post.id}`;
    const date = post.published_at ? new Date(post.published_at) : null;
    const dateLabel = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

    return <article className="pm-post-preview pm-home-post">
        <div className="pm-post-author">
            <Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={37}/>
            <div className="pm-post-author-meta"><strong>{post.author.name}</strong>
                <small>{post.author.profile?.role || 'Community member'} · {dateLabel}</small>
            </div>
            <span className="pm-topic-label">{post.topic === 'Questions' ? 'Ask the community' : post.topic}</span>
        </div>
        {post.title && <Link href={link} className="pm-home-post-title">{post.title}</Link>}
        <Link href={link} className="pm-post-text">{post.body}</Link>
        {post.ai_generated && <span className="pm-ai-disclosure">AI-generated community content</span>}
        <div className="pm-post-actions">
            <PostEngagementActions postId={post.id} initial={post.viewer_reaction} total={post.reactions_count ?? post.likes_count}
                comments={post.comments_count} canInteract={canInteract} onJoin={onJoin} />
        </div>
    </article>;
}
