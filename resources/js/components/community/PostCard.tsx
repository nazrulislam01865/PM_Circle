import { Link } from '@inertiajs/react';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import type { ReactionType, RequestToJoin } from '@/components/home/HomeEngagement';
import { Avatar } from '@/components/pm/Avatar';
import { PostContent } from '@/components/community/PostContent';
import { PostActionMenu } from '@/components/community/PostActionMenu';
import { PostPoll } from '@/components/community/PostPoll';

export type PostPreview = {
    id: number;
    title?: string | null;
    body: string;
    image_path?: string | null;
    topic: string;
    tags?: string[] | null;
    claps_count?: number;
    likes_count?: number;
    reactions_count?: number;
    viewer_reaction?: ReactionType | null;
    comments_count: number;
    published_at: string | null;
    ai_generated?: boolean; is_anonymous?: boolean; visibility?: string;
    viewer_is_author?: boolean; viewer_muted?: boolean; viewer_saved?: boolean; viewer_vote?: number | null;
    poll_options?: { id: number; label: string; votes_count: number }[];
    author: {
        name: string;
        id?: number;
        profile?: {
            role?: string | null;
            avatar_path?: string | null;
        } | null;
    };
};

export function PostCard({
    post,
    isGuest = true,
    onJoin = () => {},
    onReactionChange,
    onCommentAdded, onSavedChange, onRemoved, onUpdated, onMuteChange, mode = 'feed',
}: {
    post: PostPreview;
    isGuest?: boolean;
    onJoin?: RequestToJoin;
    onReactionChange?: (reaction: ReactionType | null, count: number) => void;
    onCommentAdded?: () => void;
    onSavedChange?: (saved: boolean) => void; onRemoved?: () => void;
    onUpdated?: (updated: { body: string; image_path: string | null }) => void;
    onMuteChange?: (muted: boolean) => void;
    mode?: 'feed' | 'detail';
}) {
    const formattedDate = post.published_at
        ? new Date(post.published_at).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : '';


    const categoryLabel = post.topic === 'Ask the community' || post.topic === 'Questions'
        ? 'Question' : post.topic === 'Poll' ? 'Poll' : null;

    return (
        <article className={`pm-discussion-card pm-unified-post-card${mode === 'detail' ? ' pm-post-detail-card' : ''}`}>
            <header className="pm-card-author-header">
                <div className="pm-author-info-wrap">
                    <Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={40} />
                    <div className="pm-author-meta">
                        <strong>{post.author.name}</strong>
                        <small>Posted {formattedDate}{categoryLabel && <> · <span className="pm-post-category-inline">{categoryLabel}</span></>}</small>
                    </div>
                </div>
                {!isGuest && <PostActionMenu post={{ id: post.id, body: post.body, image_path: post.image_path, topic: post.topic, is_anonymous: post.is_anonymous, visibility: post.visibility }} isOwner={Boolean(post.viewer_is_author)} muted={Boolean(post.viewer_muted)} authorName={post.author.name}
                    onRemoved={onRemoved} onUpdated={onUpdated} onMuteChange={onMuteChange} />}
            </header>

            <div className="pm-post-card-main pm-post-aligned-content">
                {post.title && (mode === 'detail' ? <h1 className="pm-card-title">{post.title}</h1> : <h3 className="pm-card-title"><Link href={`/posts/${post.id}`}>{post.title}</Link></h3>)}
                {mode === 'detail' ? <PostContent className="pm-card-body" body={post.body} image={post.image_path}/>
                    : <Link href={`/posts/${post.id}`} className="pm-unified-post-body-link" aria-label={`View discussion by ${post.author.name}`}><PostContent className="pm-card-body" body={post.body} image={post.image_path}/></Link>}
            </div>
            {post.topic === 'Poll' && post.poll_options && <PostPoll postId={post.id} options={post.poll_options} selected={post.viewer_vote} canInteract={!isGuest} onJoin={onJoin}/>}

            {post.ai_generated && <p className="pm-ai-disclosure">AI-generated community content</p>}
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
                    canInteract={!isGuest} onJoin={onJoin} onReactionChange={onReactionChange} onCommentAdded={onCommentAdded} showSave saved={Boolean(post.viewer_saved)} onSavedChange={onSavedChange} inlineComments={mode === 'feed'} />
                {isGuest && mode === 'feed' && <Link href={`/posts/${post.id}`} className="pm-read-discussion-link">Read discussion →</Link>}
            </footer>
        </article>
    );
}
