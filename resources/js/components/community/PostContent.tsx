import { Fragment, type ReactNode } from 'react';

/** Render the small post-formatting subset as React text nodes, never raw HTML. */
function inline(text: string): ReactNode[] {
    const tokens: ReactNode[] = [];
    const pattern = /(\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\+\+([^+\n]+)\+\+)/g;
    let cursor = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > cursor) tokens.push(text.slice(cursor, match.index));
        const key = tokens.length;
        if (match[2]) tokens.push(<strong key={key}>{match[2]}</strong>);
        else if (match[3]) tokens.push(<em key={key}>{match[3]}</em>);
        else tokens.push(<u key={key}>{match[4]}</u>);
        cursor = pattern.lastIndex;
    }
    if (cursor < text.length) tokens.push(text.slice(cursor));
    return tokens;
}

type ListLine = { value: string };

export function PostContent({ body, image, className = '' }: { body: string; image?: string | null; className?: string }) {
    // Refresh previously cached media responses once; the same URL is reused on every feed.
    const imageUrl = image?.startsWith('/post-media/') ? `${image}?v=3` : image;
    const blocks: ReactNode[] = [];
    const lines = body.replace(/\r\n/g, '\n').split('\n');
    for (let index = 0; index < lines.length;) {
        const bullet = lines[index].match(/^(\s*[-*]|\s*\d+\.)\s+(.+)$/);
        if (bullet) {
            const ordered = /^\s*\d+\./.test(bullet[1]);
            const items: ListLine[] = [];
            while (index < lines.length) {
                const next = lines[index].match(/^(\s*[-*]|\s*\d+\.)\s+(.+)$/);
                if (!next || /^\s*\d+\./.test(next[1]) !== ordered) break;
                items.push({ value: next[2] });
                index++;
            }
            const contents = items.map((item, itemIndex) => <li key={itemIndex}>{inline(item.value)}</li>);
            blocks.push(ordered ? <ol key={blocks.length}>{contents}</ol> : <ul key={blocks.length}>{contents}</ul>);
            continue;
        }
        const value = lines[index];
        blocks.push(value ? <p key={blocks.length}>{inline(value)}</p> : <Fragment key={blocks.length}><span className="pm-post-empty-line" /></Fragment>);
        index++;
    }
    return <div className={`pm-post-content ${className}`}>
        {blocks}
        {imageUrl && <img className="pm-post-content-image" src={imageUrl} alt="Image attached to post" loading="lazy" decoding="async" />}
    </div>;
}
