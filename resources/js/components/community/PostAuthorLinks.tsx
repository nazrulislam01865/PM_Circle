import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { PostPreview } from './PostCard';

/** Use the existing public member route; never reveal an anonymous author's identity. */
export function postAuthorHref(post: Pick<PostPreview, 'author' | 'is_anonymous' | 'viewer_is_author'>, sample = false): string | undefined {
    if (sample || post.is_anonymous) return undefined;
    return post.author.profile_url ?? undefined;
}

export type ProfileUnavailable = 'anonymous' | 'private';

/** Anonymous identities are actionable without disclosing the real author. */
export function postAuthorUnavailable(post: Pick<PostPreview, 'author' | 'is_anonymous' | 'viewer_is_author'>, sample = false): ProfileUnavailable | undefined {
    if (sample) return undefined;
    if (post.is_anonymous) return 'anonymous';
    if (post.author.id && !postAuthorHref(post)) return 'private';
    return undefined;
}

export function PostAuthorLink({ href, name, avatar = false, unavailable, children }: { href?: string | null; name: string; avatar?: boolean; unavailable?: ProfileUnavailable; children: ReactNode }) {
    const className = avatar ? 'pm-post-author-link pm-post-avatar-link' : 'pm-post-author-link';
    if (href && !unavailable) return <Link href={href} className={className} aria-label={`View ${name}'s profile`}>{children}</Link>;
    if (!unavailable) return <>{children}</>;
    return <Dialog>
        <DialogTrigger asChild><button type="button" className={className} aria-label={unavailable === 'anonymous' ? 'About this anonymous member' : `About ${name}'s profile`}>{children}</button></DialogTrigger>
        <DialogContent className="pm-author-profile-dialog" overlayClassName="pm-author-profile-overlay" closeClassName="pm-author-profile-close">
            <DialogTitle>{unavailable === 'anonymous' ? 'Anonymous member' : 'Profile unavailable'}</DialogTitle>
            <DialogDescription>{unavailable === 'anonymous' ? 'This member chose to publish anonymously. Their name, photo and public profile are not linked to this post.' : 'This member’s public profile is not available.'}</DialogDescription>
            <DialogClose asChild><button type="button" className="pm-button">Close</button></DialogClose>
        </DialogContent>
    </Dialog>;
}
