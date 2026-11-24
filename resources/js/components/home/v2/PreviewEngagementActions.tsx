import { MessageCircle, Bookmark, Share2, ArrowRight } from 'lucide-react';
import { EngagementOverflowMenu } from '@/components/community/EngagementOverflowMenu';
import { Link, router } from '@inertiajs/react';
import { EngagementActionBar } from '@/components/community/EngagementActionBar';
import { ReactionPicker, type RequestToJoin } from '@/components/home/HomeEngagement';

/** Demo content cannot be reacted to or saved; actions invite the member to the live feed. */
export function PreviewEngagementActions({ href, reactions = 0, showSave = false, mobileCompact = showSave, onJoin }: {
    href: string;
    reactions?: number;
    showSave?: boolean;
    mobileCompact?: boolean;
    onJoin: RequestToJoin;
}) {
    return <EngagementActionBar className={mobileCompact ? "pm-post-engagement-row" : ""}>
        <ReactionPicker endpoint="" total={reactions} canInteract={false} onJoin={onJoin} label="discussion"/>
        <Link href={href} className="pm-home-action"><MessageCircle size={19} aria-hidden="true"/> Comment</Link>
        <button type="button" className={`pm-home-action${mobileCompact ? ' pm-post-desktop-action' : ''}`} onClick={() => onJoin('share a discussion')}>
            <Share2 size={19} aria-hidden="true"/> Share
        </button>
        {showSave && <button type="button" className="pm-home-action pm-post-desktop-action" onClick={() => onJoin('save a post')}>
            <Bookmark size={19} aria-hidden="true"/> Save
        </button>}
    </EngagementActionBar>;
}

/** Sample cards retain their join/navigation behavior; no fake roster or mutations. */
export function SamplePostMobileMenu({ href, onJoin }: { href: string; onJoin: RequestToJoin }) {
    return <EngagementOverflowMenu label="More discussion options" actions={[
        { label: 'Share', icon: <Share2 size={17}/>, onSelect: () => onJoin('share a discussion') },
        { label: 'Save', icon: <Bookmark size={17}/>, onSelect: () => onJoin('save a post') },
        { label: 'Read discussion', icon: <ArrowRight size={17}/>, onSelect: () => router.visit(href) },
    ]}/>;
}
