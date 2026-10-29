import { router, useForm } from '@inertiajs/react';
import { ChevronDown, MessageCircle, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/pm/Avatar';

export type CommunityCommentData = {
    id: number; body: string; created_at: string; likes_count: number;
    author: { name: string }; replies: CommunityCommentData[];
};
const relativeTime = (created: string) => {
    const elapsed = Date.now() - Date.parse(created);
    const hours = Math.max(1, Math.floor(elapsed / 3600000));
    return hours < 24 ? `${hours} hours ago` : `${Math.floor(hours / 24)} days ago`;
};
export function CommunityComment({ comment, postId, postAuthor, canInteract, likedIds, nested = false, demo = false, replyParentId }: {
    comment: CommunityCommentData; postId: number; postAuthor: string;
    canInteract: boolean; likedIds: number[]; nested?: boolean; demo?: boolean; replyParentId?: number;
}) {
    const [reply, setReply] = useState(false);
    const [expanded, setExpanded] = useState(comment.author.name === 'Arif Hasan');
    const form = useForm({ body: '', parent_id: replyParentId ?? comment.id });
    const liked = likedIds.includes(comment.id);
    const sampleLikes: Record<string, number> = { 'Arif Hasan': 8, 'Sarah Chen': 15, 'Omar Farooq': 4, 'Nadia Rahman': 6 };
    const displayedLikes = comment.likes_count + (demo ? sampleLikes[comment.author.name] ?? 0 : 0);
    const like = () => canInteract ? router.post(`/posts/${postId}/comments/${comment.id}/like`, {}, { preserveScroll: true }) : router.visit('/login');
    return <div className={nested ? 'pm-thread-reply' : 'pm-thread-comment'}>
        <div className="pm-thread-portrait"><Avatar name={comment.author.name} size={nested ? 39 : 47}/></div>
        <div className="pm-thread-body"><div className="pm-thread-author"><strong>{comment.author.name}</strong>{comment.author.name === postAuthor && <span className="pm-author-chip">Author</span>}<span>· &nbsp;{demo ? nested ? '2 hours ago' : '3 hours ago' : relativeTime(comment.created_at)}</span><span className="pm-thread-menu" aria-hidden="true">···</span></div>
            <p>{comment.body}</p><div className="pm-thread-actions"><button type="button" onClick={like} aria-pressed={liked}><ThumbsUp size={17} fill={liked ? 'currentColor' : 'none'}/> Like {displayedLikes || ''}</button>
                <button type="button" onClick={() => canInteract ? setReply(!reply) : router.visit('/login')}><MessageCircle size={16}/> Reply</button></div>
            {reply && canInteract && <form className="pm-inline-reply" onSubmit={e => { e.preventDefault(); form.post(`/posts/${postId}/comments`, { preserveScroll: true, onSuccess: () => { form.reset('body'); setReply(false); } }); }}>
                <textarea aria-label={`Reply to ${comment.author.name}`} value={form.data.body} onChange={e => form.setData('body', e.target.value)} required maxLength={3000} minLength={2} placeholder="Write a thoughtful reply..."/>
                {form.errors.body && <p className="pm-error">{form.errors.body}</p>}<button className="pm-button pm-button-sm" disabled={form.processing}>Post reply</button>
            </form>}
            {!nested && Boolean(comment.replies?.length) && <div className="pm-thread-branch"><button type="button" className="pm-thread-toggle" onClick={() => setExpanded(!expanded)}><ChevronDown size={15} className={expanded ? 'pm-rotate' : ''}/>{expanded ? 'Hide' : 'View'} {comment.replies.length} replies</button>
                {expanded && comment.replies.map(r => <CommunityComment key={r.id} comment={r} postId={postId} postAuthor={postAuthor} canInteract={canInteract} likedIds={likedIds} nested demo={demo} replyParentId={comment.id}/>)}</div>}
        </div>
    </div>;
}
