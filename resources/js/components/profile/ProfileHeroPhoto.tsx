import { useState } from 'react';

/** The profile-page portrait safely falls back to initials when a stored image is unavailable. */
export function ProfileHeroPhoto({ name, src }: { name: string; src?: string | null }) {
    const [failedSource, setFailedSource] = useState<string | null>(null);
    const imageSource = src && src !== failedSource ? src : null;
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || '?';

    return <div className="pm-hero-avatar" role="img" aria-label={`Profile photo for ${name}`}>
        {imageSource ? (
            <img className="pm-profile-hero-photo-img" src={imageSource} alt="" onError={() => setFailedSource(imageSource)} />
        ) : (
            <span className="pm-profile-hero-photo-fallback" aria-hidden="true">{initials}</span>
        )}
    </div>;
}
