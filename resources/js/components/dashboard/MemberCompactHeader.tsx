import { ChevronRight, Menu } from 'lucide-react';
import { Brand } from '@/components/pm/Brand';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import type { DashboardShellData } from '@/types/dashboard';

/** Authenticated-only header. Navigation belongs in the shared sidebar. */
export function MemberCompactHeader({ dashboard, onOpenNavigation, onExpandNavigation }: {
    dashboard: DashboardShellData;
    onOpenNavigation?: () => void;
    onExpandNavigation?: () => void;
}) {
    return <header className="pm-member-compact-header" aria-label="Member header">
        <div className="pm-member-compact-header-inner">
            {onOpenNavigation && <button type="button" className="pm-member-sidebar-trigger" aria-label="Open member navigation" aria-controls="pm-member-sidebar" onClick={onOpenNavigation}><Menu size={23} aria-hidden="true"/></button>}
            {onExpandNavigation && <button type="button" className="pm-member-sidebar-expand" aria-label="Expand navigation" aria-controls="pm-member-sidebar" aria-expanded={false} onClick={onExpandNavigation}><ChevronRight size={20} aria-hidden="true"/></button>}
            <div className="pm-member-compact-brand"><Brand href="/dashboard"/></div>
            <div className="pm-member-compact-actions">
                <DashboardHeader name={dashboard.member.name} avatar={dashboard.member.avatar_path} isDemo={dashboard.isDemo} compact/>
            </div>
        </div>
    </header>;
}
