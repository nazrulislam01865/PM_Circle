import { useState, type ReactNode } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SiteHeader } from '@/components/pm/SiteHeader';
import type { DashboardShellData } from '@/types/dashboard';

/** Member pages share the public site header while retaining their existing sidebar and controls. */
export function MemberDashboardLayout({ dashboard, children, variant = 'dashboard' }: { dashboard: DashboardShellData; children: ReactNode; variant?: 'dashboard' | 'learning' | 'learning-catalog' }) {
    const [navOpen, setNavOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return typeof window !== 'undefined' && window.localStorage.getItem('pm-sidebar-collapsed') === 'true'; }
        catch { return false; }
    });
    const toggleSidebar = () => setSidebarCollapsed(value => {
        const next = !value;
        try { window.localStorage.setItem('pm-sidebar-collapsed', String(next)); } catch { /* Optional preference. */ }
        return next;
    });
    return <div className={`pm-app pm-dashboard pm-dashboard-shared-header ${sidebarCollapsed ? 'is-sidebar-collapsed ' : ''}${variant !== 'dashboard' ? 'pm-learning-view' : ''} ${variant === 'learning-catalog' ? 'pm-learning-catalog-view' : ''}`}>
        <SiteHeader brandPlacement={variant === 'learning-catalog' ? 'always' : 'mobile'} actions={<DashboardHeader name={dashboard.member.name} avatar={dashboard.member.avatar_path} isDemo={dashboard.isDemo} onMenu={() => setNavOpen(true)}/>}/>
        <div className="pm-dashboard-layout">
            <DashboardSidebar dashboard={dashboard} open={navOpen} close={() => setNavOpen(false)} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
            <div className="pm-dash-workspace">
                <main id="main-content" className="pm-dash-body">{children}</main>
            </div>
        </div>
    </div>;
}
