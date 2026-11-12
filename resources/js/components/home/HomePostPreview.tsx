import { PostCard } from '@/components/community/PostCard';
import type { ReactionType, RequestToJoin } from './HomeEngagement';

export type HomePost = {
    id: number; body: string; image_path?: string | null; title?: string | null; topic: string;
    likes_count: number; reactions_count?: number; viewer_reaction?: ReactionType | null;
    comments_count: number; ai_generated?: boolean; published_at: string | null;
    author: { name: string; profile?: { role?: string | null; avatar_path?: string | null } | null };
};

/** Public homepage and dashboard share the same post presentation and reactions. */
export function HomePostPreview({ post, canInteract, onJoin }: {
    post: HomePost; canInteract: boolean; onJoin: RequestToJoin;
}) {
    return <PostCard post={post} isGuest={!canInteract} onJoin={onJoin} />;
}
