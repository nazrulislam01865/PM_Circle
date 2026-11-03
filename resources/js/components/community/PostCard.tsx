import { Link } from '@inertiajs/react';
import { Bookmark, Heart, Lock, MessageSquare, Share2, Sparkles } from 'lucide-react';
import { useState } from 'react';
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
    comments_count: number;
    published_at: string | null;
    ai_generated?: boolean;
    author: {
        name: string;
        profile?: {
            role?: string;
        } | null;
    };
};

export function PostCard({
    post,
    isGuest = true,
}: {
    post: PostPreview;
    isGuest?: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        const url = `${window.location.origin}/posts/${post.id}`;
        if (navigator.clipboard) {
            void navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

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
                    <Avatar name={post.author.name} size={40} />
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
                <div className="pm-action-buttons-group">
                    {isGuest ? (
                        <>
                            <span className="pm-action-item" title="Sign in to like">
                                <Lock size={13} /> Like
                            </span>
                            <span className="pm-action-item" title="Sign in to clap">
                                <Lock size={13} /> Clap
                            </span>
                            <span className="pm-action-item" title="Sign in to comment">
                                <Lock size={13} /> Comment
                            </span>
                        </>
                    ) : (
                        <>
                            <Link href={`/posts/${post.id}`} className="pm-action-item">
                                <Heart size={15} /> {post.likes_count ?? post.reactions_count ?? 'Like'}
                            </Link>
                            <Link href={`/posts/${post.id}`} className="pm-action-item">
                                <Sparkles size={15} /> {post.claps_count ?? 'Clap'}
                            </Link>
                            <Link href={`/posts/${post.id}`} className="pm-action-item">
                                <MessageSquare size={15} /> {post.comments_count ?? 'Comment'}
                            </Link>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={handleShare}
                        className="pm-action-item"
                        style={{ color: 'var(--primary)' }}
                    >
                        <Share2 size={14} /> {copied ? 'Copied!' : 'Share'}
                    </button>

                    {isGuest ? (
                        <span className="pm-action-item" title="Sign in to save">
                            <Lock size={13} /> Save
                        </span>
                    ) : (
                        <Link href={`/posts/${post.id}`} className="pm-action-item">
                            <Bookmark size={14} /> Save
                        </Link>
                    )}
                </div>

                <Link href={`/posts/${post.id}`} className="pm-read-discussion-link">
                    Read discussion →
                </Link>
            </footer>
        </article>
    );
}
