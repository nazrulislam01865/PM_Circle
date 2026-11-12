import { MessageCircle } from 'lucide-react';
import { EngagementActionBar } from './EngagementActionBar';
import { ReactionPicker, type ReactionType, type RequestToJoin } from '@/components/home/HomeEngagement';

/** Same reaction picker as the post card, restricted to reaction and reply controls. */
export function CommentEngagementActions({ postId, commentId, initial, total, canInteract, onJoin, onReply, replying = false }: {
    postId: number;
    commentId: number;
    initial?: ReactionType | null;
    total: number;
    canInteract: boolean;
    onJoin: RequestToJoin;
    onReply: () => void;
    replying?: boolean;
}) {
    return <EngagementActionBar className="pm-comment-engagement">
        <ReactionPicker key={`${postId}-${commentId}`} endpoint={`/posts/${postId}/comments/${commentId}/reactions`}
            initial={initial} total={total} canInteract={canInteract} onJoin={onJoin} label="comment" />
        <button type="button" className="pm-home-action" aria-expanded={replying} onClick={onReply}>
            <MessageCircle size={19} aria-hidden="true"/> Reply
        </button>
    </EngagementActionBar>;
}
