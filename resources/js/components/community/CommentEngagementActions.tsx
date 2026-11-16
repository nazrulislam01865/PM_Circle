import { MessageCircle } from 'lucide-react';
import { EngagementActionBar } from './EngagementActionBar';
import { ReactionPicker, type ReactionType, type RequestToJoin } from '@/components/home/HomeEngagement';

/** Same reaction picker as the post card, restricted to reaction and reply controls. */
export function CommentEngagementActions({ postId, commentId, endpoint, initial, total, canInteract, onJoin, onReply, replying = false, showReply = true }: {
    postId?: number;
    commentId?: number;
    endpoint?: string;
    showReply?: boolean;
    initial?: ReactionType | null;
    total: number;
    canInteract: boolean;
    onJoin: RequestToJoin;
    onReply: () => void;
    replying?: boolean;
}) {
    return <EngagementActionBar className="pm-comment-engagement">
        <ReactionPicker key={endpoint ?? `${postId}-${commentId}`} endpoint={endpoint ?? `/posts/${postId}/comments/${commentId}/reactions`}
            initial={initial} total={total} canInteract={canInteract} onJoin={onJoin} label="comment" />
        {showReply && <button type="button" className="pm-home-action" aria-expanded={replying} onClick={onReply}>
            <MessageCircle size={19} aria-hidden="true"/> Reply
        </button>}
    </EngagementActionBar>;
}
