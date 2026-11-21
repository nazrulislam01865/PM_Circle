import type { ImgHTMLAttributes } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> & {
    src: string;
    sizes?: string;
};

/** Reuse original route authorization; only the query string chooses the optional preview. */
export function CommunityResponsiveImage({ src, sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 800px', ...props }: Props) {
    const pathname = src.split('?')[0];
    const publishedRoute = /^\/post-media\/|^\/posts\/\d+\/media\/|^\/posts\/\d+\/comments\/\d+\/media\//.test(pathname);
    const previewable = publishedRoute && /\.(?:jpe?g|png)$/i.test(pathname);
    const separator = src.includes('?') ? '&' : '?';
    const srcSet = previewable
        ? [320, 640, 1200].map(width => `${src}${separator}size=${width} ${width}w`).join(', ')
        : undefined;

    return <img {...props} src={src} srcSet={srcSet} sizes={srcSet ? sizes : undefined} loading="lazy" decoding="async" />;
}
