import { usePostSecondaryActions } from './usePostSecondaryActions';
import { PostActionMenu } from './PostActionMenu';
import { Link } from '@inertiajs/react';
import { PostAuthorLink, postAuthorHref, postAuthorUnavailable } from './PostAuthorLinks';
import { Avatar } from '@/components/pm/Avatar';
import { PostEngagementActions } from '@/components/community/PostEngagementActions';
import { PostContent } from '@/components/community/PostContent';
import type { PostPreview } from '@/components/community/PostCard';
import type { RequestToJoin } from '@/components/home/HomeEngagement';
import { homeRelativeDate } from '@/lib/home-date';
import { PreviewEngagementActions, SamplePostMobileMenu } from '@/components/home/v2/PreviewEngagementActions';

/** V2: compact prototype card for guest homepage, reusable for future feed variants.
 * Real posts reuse the centralized engagement API; sample previews never make writes.
 */
export function PostCardV2({ post, canInteract = false, onJoin, sample = false }: {
    post: PostPreview; canInteract?: boolean; onJoin: RequestToJoin; sample?: boolean;
}) {
    const secondary = usePostSecondaryActions({ postId: post.id, canInteract: canInteract && !sample, onJoin, saved: Boolean(post.viewer_saved) });
    const href = sample ? '/community' : `/posts/${post.id}`;
    const authorHref = postAuthorHref(post, sample);
    const authorUnavailable = postAuthorUnavailable(post, sample);
    return <article className="pm-v2-post-card" aria-label={`${sample ? 'Sample discussion by' : 'Discussion by'} ${post.author.name}`}>
        <header className="pm-v2-post-author"><PostAuthorLink href={authorHref} name={post.author.name} avatar unavailable={authorUnavailable}><Avatar name={post.author.name} src={post.author.profile?.avatar_path} size={42}/></PostAuthorLink>
            <div><strong><PostAuthorLink href={authorHref} name={post.author.name} unavailable={authorUnavailable}>{post.author.name}</PostAuthorLink></strong><small>{post.author.profile?.role || 'Project professional'} · {sample ? 'Sample discussion' : homeRelativeDate(post.published_at || '')}</small></div>
            {sample ? <SamplePostMobileMenu href={href} onJoin={onJoin}/> : <PostActionMenu post={{ id: post.id, body: post.body, topic: post.topic }} isOwner={false} mobileOnly canInteract={canInteract} onJoin={onJoin} secondary={secondary} readHref={href} authorName={post.author.name}/>}
        </header>
        <div className="pm-v2-post-content"><h3><Link href={href}>{post.title || 'Community discussion'}</Link></h3>
            <Link href={href} className="pm-unified-post-body-link" aria-label={`View discussion by ${post.author.name}`}><PostContent body={post.body} image={post.image_path} className="pm-v2-post-body"/></Link>
            {post.ai_generated && <span className="pm-ai-disclosure">AI-generated community content</span>}</div>
        <footer className="pm-v2-post-actions">
            {sample ? <PreviewEngagementActions href={href} reactions={post.reactions_count ?? post.likes_count ?? 0} onJoin={onJoin} showSave/>
                : <PostEngagementActions postId={post.id} initial={post.viewer_reaction}
                    total={post.reactions_count ?? post.likes_count ?? 0} breakdown={post.reaction_breakdown}
                    comments={post.comments_count} canInteract={canInteract} onJoin={onJoin} inlineComments={false} showSave secondary={secondary} />}
        </footer>
    </article>;
}
