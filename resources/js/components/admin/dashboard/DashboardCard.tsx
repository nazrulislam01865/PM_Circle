import type { ReactNode } from 'react';

export function DashboardCard({ title, subtitle, action, children, className = '' }: {
    title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
    return <section className={`pm-admin-overview-card pm-admin-panel ${className}`}>
        <div className="pm-admin-overview-card-header">
            <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
            {action}
        </div>
        {children}
    </section>;
}
