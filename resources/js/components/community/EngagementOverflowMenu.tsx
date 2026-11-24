import { Ellipsis } from 'lucide-react';
import type { ReactNode } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Action = { label: string; icon: ReactNode; onSelect: () => void; disabled?: boolean };

/** Secondary actions remain available without adding another row to mobile discussion cards. */
export function EngagementOverflowMenu({ label, actions }: { label: string; actions: Action[] }) {
    return <div className="pm-post-actions-root pm-post-mobile-menu"><DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" className="pm-post-menu-trigger" aria-label={label}><Ellipsis size={21} aria-hidden="true"/></button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="pm-post-menu-content">
            {actions.map(action => <DropdownMenuItem key={action.label} className="pm-post-menu-item" disabled={action.disabled} onSelect={action.onSelect}>{action.icon}{action.label}</DropdownMenuItem>)}
        </DropdownMenuContent>
    </DropdownMenu></div>;
}
