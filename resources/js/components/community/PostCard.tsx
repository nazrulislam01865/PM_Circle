import { Link } from '@inertiajs/react';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import type { ReactionType, RequestToJoin } from '@/components/home/HomeEngagement';
import { Avatar } from '@/components/pm/Avatar';

export type PostPreview = {
    id: number;
    title?: string | null;
    body: string;
    topic: string;
    tags?: string[] | null;
    claps_count?: number;
    likes_count?: number;
    reactions_count?: number;
    viewer_reaction?: ReactionType | null;
    comments_count: number;
    published_at: string | null;
    ai_generated?: boolean;
    author: {
        name: string;
        profile?: {
            role?: string;
            avatar_path?: string | null;
        } | null;
    };
};

export function PostCard({
    post,
    isGuest = true,
    onJoin = () => {},
}: {
    post: PostPreview;
    isGuest?: boolean;
    onJoin?: RequestToJoin;
}) {
    const formattedDate = post.published_at
        ? new Date(post.published_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : '';

    const authorRole = post.author.profile?.role;
    const authorMeta = authorRole ? `${authorRole} · ${formattedDate}` : formattedDate;

    // Normalizing category badge label
    let badgeLabel = post.topic;
    if (post.topic === 'Questions' || post.topic === 'Ask the community') {
        badgeLabel = 'Question';
    }

    return (
        <article className="pm-discussion-card">
            <header className="pm-card-author-header">
                <div className="pm-author-info-wrap">
                    <Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={40} />
                    <div className="pm-author-meta">
                        <strong>{post.author.name}</strong>
                        <span>{authorMeta}</span>
                    </div>
                </div>
                <span className="pm-category-badge">{badgeLabel}</span>
            </header>

            {post.title && (
                <h3 className="pm-card-title">
                    <Link href={`/posts/${post.id}`}>{post.title}</Link>
                </h3>
            )}

            <p className="pm-card-body">{post.body}</p>

            {post.tags && post.tags.length > 0 && (
                <div className="pm-tag-pills-row">
                    {post.tags.map((tag) => (
                        <span key={tag} className="pm-tag-pill">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <footer className="pm-card-action-bar">
                <PostEngagementActions postId={post.id} initial={post.viewer_reaction}
                    total={post.reactions_count ?? post.likes_count ?? 0} comments={post.comments_count}
                    canInteract={!isGuest} onJoin={onJoin} />
                <Link href={`/posts/${post.id}`} className="pm-read-discussion-link">Read discussion →</Link>
            </footer>
        </article>
    );
}
