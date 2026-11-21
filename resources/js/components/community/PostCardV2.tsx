import { Link } from '@inertiajs/react';
import { Avatar } from '@/components/pm/Avatar';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import { PostContent } from '@/components/community/PostContent';
import type { PostPreview } from '@/components/community/PostCard';
import type { RequestToJoin } from '@/components/home/HomeEngagement';
import { homeRelativeDate } from '@/lib/home-date';
import { PreviewEngagementActions } from '@/components/home/v2/PreviewEngagementActions';

/** V2: compact prototype card for guest homepage, reusable for future feed variants.
 * Real posts reuse the centralized engagement API; sample previews never make writes.
 */
export function PostCardV2({ post, canInteract = false, onJoin, sample = false }: {
    post: PostPreview; canInteract?: boolean; onJoin: RequestToJoin; sample?: boolean;
}) {
    const href = sample ? '/community' : `/posts/${post.id}`;
    return <article className="pm-v2-post-card" aria-label={`${sample ? 'Sample discussion by' : 'Discussion by'} ${post.author.name}`}>
        <header className="pm-v2-post-author"><Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={42}/>
            <div><strong>{post.author.name}</strong><small>{post.author.profile?.role || 'Project professional'} · {sample ? 'Sample discussion' : homeRelativeDate(post.published_at || '')}</small></div>
        </header>
        <div className="pm-v2-post-content"><h3><Link href={href}>{post.title || 'Community discussion'}</Link></h3>
            <PostContent body={post.body} image={post.image_path} className="pm-v2-post-body"/>
            {post.ai_generated && <span className="pm-ai-disclosure">AI-generated community content</span>}</div>
        <footer className="pm-v2-post-actions">
            {sample ? <PreviewEngagementActions href={href} reactions={post.reactions_count ?? post.likes_count ?? 0} onJoin={onJoin} showSave/>
                : <PostEngagementActions postId={post.id} initial={post.viewer_reaction}
                    total={post.reactions_count ?? post.likes_count ?? 0} breakdown={post.reaction_breakdown}
                    comments={post.comments_count} canInteract={canInteract} onJoin={onJoin} inlineComments={false} showSave buttonLabel="React" prototypeIcon />}
        </footer>
    </article>;
}
