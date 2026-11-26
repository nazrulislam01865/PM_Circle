import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { legalInlinePattern, legalLinkPattern, safeLink } from './legal-links';

export type LegalSection = { id: string; title: string; body: string; toc_label?: string | null; show_in_toc?: boolean };
export type LegalContent = {
    title: string;
    description: string;
    meta_description: string;
    toc_title: string;
    sections: LegalSection[];
};
export type LegalPageData = { content: LegalContent; version: string | null; published_at: string | null };

// Restricted text formatting, not arbitrary HTML or a general-purpose Markdown parser.
// A link can only target a simple local path or a valid HTTPS URL.
function inline(text: string): ReactNode[] {
    return text.split(legalInlinePattern()).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
        const link = legalLinkPattern().exec(part);
        if (link) {
            const kind = safeLink(link[2]);
            if (kind === 'local') return <Link key={index} href={link[2]}>{link[1]}</Link>;
            if (kind === 'external') return <a key={index} href={link[2]} rel="noopener noreferrer">{link[1]}</a>;
            return link[1];
        }
        return part;
    });
}

export function LegalBody({ body }: { body: string }) {
    const blocks: { kind: 'paragraph' | 'list'; lines: string[] }[] = [];
    let current: (typeof blocks)[number] | undefined;
    for (const raw of body.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) { current = undefined; continue; }
        const kind = line.startsWith('- ') ? 'list' : 'paragraph';
        if (!current || current.kind !== kind) {
            current = { kind, lines: [] };
            blocks.push(current);
        }
        current.lines.push(kind === 'list' ? line.slice(2) : line);
    }
    return <>{blocks.map((block, i) => block.kind === 'list'
        ? <ul className="pm-terms-list" key={i}>{block.lines.map((line, j) => <li key={j}>{inline(line)}</li>)}</ul>
        : <p key={i}>{inline(block.lines.join(' '))}</p>)}</>;
}
