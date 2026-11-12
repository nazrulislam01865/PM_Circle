import type { LucideIcon } from 'lucide-react';

export type HomepageIconAssets = Record<string, Record<string, string>>;

/** Optional uploaded icon, otherwise the original Lucide icon is used unchanged. */
export function HomeContentIcon({ fallback: Fallback, size = 24, strokeWidth, className, image }: {
    category: string;
    icon: string;
    assets?: HomepageIconAssets;
    fallback: LucideIcon;
    size?: number;
    strokeWidth?: number;
    className?: string;
    image?: string | null;
}) {
    if (image) {
        return <img src={image} className={`pm-home-custom-icon ${className ?? ''}`} width={36} height={36} alt="" aria-hidden="true" loading="lazy" decoding="async"/>;
    }
    // Uploaded artwork belongs to each homepage item; global master-data icon overrides are not used.

    return <Fallback aria-hidden="true" size={size} strokeWidth={strokeWidth} className={className}/>;
}
