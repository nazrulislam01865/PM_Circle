import { MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import { ReactionPicker, type RequestToJoin } from '@/components/home/HomeEngagement';

/** Demo content cannot be reacted to or saved; actions invite the member to the live feed. */
export function PreviewEngagementActions({ href, reactions = 0, showSave = false, onJoin }: {
    href: string;
    reactions?: number;
    showSave?: boolean;
    onJoin: RequestToJoin;
}) {
    return <EngagementActionBar>
        <ReactionPicker endpoint="" total={reactions} canInteract={false} onJoin={onJoin} label="discussion" buttonLabel="React" prototypeIcon/>
        <Link href={href} className="pm-home-action"><MessageCircle size={19} aria-hidden="true"/> Comment</Link>
        <button type="button" className="pm-home-action" onClick={() => onJoin('share a discussion')}>
            <Share2 size={19} aria-hidden="true"/> Share
        </button>
        {showSave && <button type="button" className="pm-home-action" onClick={() => onJoin('save a post')}>
            <Bookmark size={19} aria-hidden="true"/> Save
        </button>}
    </EngagementActionBar>;
}
