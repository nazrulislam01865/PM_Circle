import { useState, type ReactNode } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import type { DashboardShellData } from '@/types/dashboard';

/** Single authenticated shell reused by dashboard, learning, settings, and community. */
export function MemberDashboardLayout({ dashboard, children, variant = 'dashboard' }: { dashboard: DashboardShellData; children: ReactNode; variant?: 'dashboard' | 'learning' }) {
    const [navOpen, setNavOpen] = useState(false);
    // Read the preference before the first client render, avoiding width jumps after Inertia navigation.
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return typeof window !== 'undefined' && window.localStorage.getItem('pm-sidebar-collapsed') === 'true'; }
        catch { return false; }
    });
    const toggleSidebar = () => setSidebarCollapsed(value => {
        const next = !value;
        try { window.localStorage.setItem('pm-sidebar-collapsed', String(next)); } catch { /* Optional preference. */ }
        return next;
    });
    return <div className={`pm-app pm-dashboard ${variant === 'learning' ? 'pm-learning-view' : ''}`}>
        <DashboardSidebar dashboard={dashboard} open={navOpen} close={() => setNavOpen(false)} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="pm-dash-workspace">
            <DashboardHeader name={dashboard.member.name} isDemo={dashboard.isDemo} onMenu={() => setNavOpen(true)} />
            <main id="main-content" className="pm-dash-body">{children}</main>
        </div>
    </div>;
}
