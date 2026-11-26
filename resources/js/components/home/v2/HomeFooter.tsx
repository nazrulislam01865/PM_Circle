import type { CSSProperties } from 'react';
import { FooterAnchor, FooterBrand, FooterSocial, safeFooterHref } from '@/components/pm/FooterIdentity';
import type { SiteFooterContent, FooterLink } from '@/types/pmp-public';

function FooterLinks({ title, items }: { title: string; items: FooterLink[] }) {
    if (!items.length) return null;
    return <nav aria-label={title}><h2>{title}</h2>{items.map((link, index) =>
        <FooterAnchor href={link.href} key={index}>{link.label}</FooterAnchor>)}</nav>;
}

/** The approved public footer renders only the saved presentation, in its saved order. */
export function HomeFooter({ content, eventsVisible: _eventsVisible = true, aiVisible: _aiVisible = true }: { content: SiteFooterContent; eventsVisible?: boolean; aiVisible?: boolean }) {
    const columns = content.columns.filter(column => column.visible && column.links.length > 0);
    const showBrand = content.show_brand || (content.show_about && Boolean(content.description)) || (content.show_social && content.socials.some(item => item.href?.startsWith('https://') && safeFooterHref(item.href)));
    const hasNotice = content.show_notice && Boolean(content.notice_label || content.legal_notice);
    const hasBottom = (content.show_copyright && Boolean(content.copyright_label)) || content.bottom_links.length > 0;
    const hasGrid = showBrand || columns.length > 0;
    const hasLegal = content.show_legal && (hasNotice || hasBottom);
    if (!hasGrid && !hasLegal) return null;
    const gridStyle = { '--pm-footer-desktop-columns': showBrand && columns.length ? `1.45fr repeat(${Math.min(4, columns.length)}, minmax(0, 1fr))` : `repeat(${Math.min(5, Math.max(1, columns.length))}, minmax(0, 1fr))` } as CSSProperties;

    return <footer className="pm-v2-site-footer" aria-label={`${content.brand_name} footer`}><div className="pm-v2-container">
        {hasGrid && <div className="pm-v2-footer-grid" style={gridStyle}>
            {showBrand && <section className="pm-v2-footer-identity">
                {content.show_brand && <FooterBrand content={content}/>}
                {content.show_about && content.description && <p>{content.description}</p>}
                {content.show_social && <FooterSocial content={content} compact/>}
            </section>}
            {columns.map((column, index) => <FooterLinks key={index} title={column.title} items={column.links}/>)}
        </div>}
        {hasLegal && <div className="pm-v2-footer-legal">
            {hasNotice && <p>{content.notice_label && <strong>{content.notice_label} </strong>}{content.legal_notice}</p>}
            {hasBottom && <div className="pm-v2-footer-last">
                {content.show_copyright && content.copyright_label && <span>{content.copyright_label}</span>}
                {content.bottom_links.length > 0 && <nav aria-label="Footer links">{content.bottom_links.map((link, index) => <FooterAnchor key={index} href={link.href}>{link.label}</FooterAnchor>)}</nav>}
            </div>}
        </div>}
    </div></footer>;
}
