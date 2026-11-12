import type { ReactNode } from 'react';
import { MemberHomeHeader } from '@/components/dashboard/MemberHomeHeader';
import type { DashboardShellData } from '@/types/dashboard';

/** The same authenticated header and full-width shell on every member page.
 * Only the homepage has its own compact dashboard content treatment. */
export function MemberDashboardLayout({ dashboard, children, variant = 'dashboard' }: {
    dashboard: DashboardShellData;
    children: ReactNode;
    variant?: 'dashboard' | 'learning' | 'learning-catalog' | 'member-home';
}) {
    return <div className={`pm-app pm-dashboard pm-member-shell${variant === 'member-home' ? ' pm-member-home' : ''}${variant === 'learning' || variant === 'learning-catalog' ? ' pm-learning-view' : ''}${variant === 'learning-catalog' ? ' pm-learning-catalog-view' : ''}`}>
        <MemberHomeHeader dashboard={dashboard} />
        <div className="pm-dashboard-layout">
            <div className="pm-dash-workspace">
                <main id="main-content" className="pm-dash-body">{children}</main>
            </div>
        </div>
    </div>;
}
