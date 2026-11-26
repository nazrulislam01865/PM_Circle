import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FooterAnchor } from '@/components/pm/FooterIdentity';
import type { SiteFooterContent } from '@/types/pmp-public';

/** Keep the compact member layout, using the same saved legal wording and copyright. */
export function MemberFooter({ content }: { content: SiteFooterContent }) {
    if (!content.show_member_footer) return null;
    const showNotice = content.show_member_notice && Boolean(content.legal_notice);
    if (!(content.show_copyright && content.copyright_label) && !content.member_links.length && !showNotice) return null;
    return <footer className="pm-member-footer" aria-label="Member footer">
        {content.show_copyright && content.copyright_label && <span>{content.copyright_label}</span>}
        {(content.member_links.length > 0 || showNotice) && <nav aria-label="Policies">
            {content.member_links.map((item, index) => <FooterAnchor key={index} href={item.href}>{item.label}</FooterAnchor>)}
            {showNotice && <Dialog>
                <DialogTrigger asChild><button type="button">{content.member_notice_label}</button></DialogTrigger>
                <DialogContent className="pm-member-policy-dialog">
                    <DialogHeader><DialogTitle>{content.member_notice_label}</DialogTitle><DialogDescription>{content.legal_notice}</DialogDescription></DialogHeader>
                    <DialogFooter><DialogClose asChild><button type="button" className="pm-button pm-button-outline">Close</button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>}
        </nav>}
    </footer>;
}
