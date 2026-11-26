export type LegalLink = { label: string; href: string; start: number; end: number };

// Keep the same restricted inline syntax in the editor and the public renderer.
export const legalInlinePattern = () => /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\))/g;
export const legalLinkPattern = () => /^\[([^\]\n]+)\]\(([^\s)]+)\)$/;

export function safeLink(href: string): 'local' | 'external' | null {
    if (/^\/(?!\/)[a-zA-Z0-9/_-]*(?:#[a-zA-Z0-9_-]+)?$/.test(href)) return 'local';
    if (!/^https:\/\//i.test(href) || /[\s\\()]/.test(href)) return null;
    try {
        const url = new URL(href);
        if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return 'external';
    } catch { /* Render invalid destinations as text. */ }
    return null;
}

export function legalLinks(body: string): LegalLink[] {
    return Array.from(body.matchAll(legalInlinePattern())).flatMap(match => {
        const link = legalLinkPattern().exec(match[0]);
        return link ? [{label: link[1], href: link[2], start: match.index!, end: match.index! + match[0].length}] : [];
    });
}

export function replaceLegalLink(body: string, link: LegalLink, replacement: string): string {
    return body.slice(0, link.start) + replacement + body.slice(link.end);
}

export function legalLinkText(label: string, href: string): string | null {
    label = label.trim();
    href = href.trim();
    if (!label || /[\[\]\r\n*]/.test(label) || !safeLink(href)) return null;
    return `[${label}](${href})`;
}
