import { Link } from '@inertiajs/react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trademarkNotice } from '@/components/pm/trademarkNotice';

/** Compact authenticated footer; public and administrator footer rendering stays separate. */
export function MemberFooter() {
    return <footer className="pm-member-footer" aria-label="Member footer">
        <span>© PM Circle by ITQAN</span>
        <nav aria-label="Policies">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refund-policy">Refund Policy</Link>
            <Dialog>
                <DialogTrigger asChild><button type="button">Trademark Notice</button></DialogTrigger>
                <DialogContent className="pm-member-policy-dialog">
                    <DialogHeader><DialogTitle>Trademark Notice</DialogTitle><DialogDescription>{trademarkNotice}</DialogDescription></DialogHeader>
                    <DialogFooter><DialogClose asChild><button type="button" className="pm-button pm-button-outline">Close</button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>
        </nav>
    </footer>;
}
