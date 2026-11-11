import type { LucideIcon } from 'lucide-react';

export type HomepageIconAssets = Record<string, Record<string, string>>;

/** Optional uploaded icon, otherwise the original Lucide icon is used unchanged. */
export function HomeContentIcon({ category, icon, assets, fallback: Fallback, size = 24, strokeWidth, className }: {
    category: string;
    icon: string;
    assets?: HomepageIconAssets;
    fallback: LucideIcon;
    size?: number;
    strokeWidth?: number;
    className?: string;
}) {
    const src = assets?.[category]?.[icon];
    if (src) {
        return <img src={src} className={`pm-home-content-icon ${className ?? ''}`} width={size} height={size} style={{ width: size, height: size }} alt="" aria-hidden="true" loading="lazy" decoding="async"/>;
    }
    return <Fallback aria-hidden="true" size={size} strokeWidth={strokeWidth} className={className}/>;
}
