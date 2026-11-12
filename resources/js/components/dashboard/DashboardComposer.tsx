import { usePage } from '@inertiajs/react';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { DashboardAvatar } from '@/components/dashboard/DashboardAvatar';
import { PostComposerDialog } from '@/components/community/PostComposerDialog';
import type { DashboardPlan } from '@/types/dashboard';

/** Single prototype compose action; full editor reused by create and edit menus. */
export function DashboardComposer({ name, plan, demo, compact = false }: { name: string; plan: DashboardPlan; demo: boolean; compact?: boolean }) {
    const { auth } = usePage<{ auth?: { user?: { avatar_path?: string | null } | null } }>().props;
    const [open, setOpen] = useState(false);
    return <>
        <div className="pm-dash-card pm-dash-composer">
            <div className="pm-dash-composer-top"><DashboardAvatar name={name} size={compact ? 38 : 54} demo={demo} src={auth?.user?.avatar_path}/>
                <button type="button" className="pm-dash-composer-input" onClick={() => setOpen(true)}>Share a lesson, ask a question...</button>
            </div>
            <div className="pm-dash-composer-buttons">
                <button type="button" onClick={() => setOpen(true)} className="pm-dash-btn pm-dash-btn-primary"><Pencil size={19}/> Post</button>
            </div>
        </div>
        <PostComposerDialog open={open} onClose={() => setOpen(false)} plan={plan}/>
    </>;
}
