import type { DashboardMix } from '@/types/admin-dashboard';
import { DashboardCard } from './DashboardCard';

const colors = ['var(--blue)', 'var(--pm-tone-0783de)', 'var(--pm-tone-8060d3)', 'var(--pm-tone-13c8b5)', 'var(--pm-tone-8ab8ef)'];

export function EngagementMix({ items }: { items: DashboardMix[] }) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    let offset = 0;
    const segments = items.map((item, i) => {
        const start = offset; offset += total > 0 ? item.value / total * 100 : 0;
        return `${colors[i % colors.length]} ${start}% ${offset}%`;
    });
    return <DashboardCard title="Engagement mix" subtitle="Recorded events by platform area" className="pm-admin-overview-mix-card">
        <div className="pm-admin-overview-mix">
            <div className="pm-admin-overview-ring" style={{ background: total ? `conic-gradient(${segments.join(', ')})` : 'var(--track)' }} role="img" aria-label={`${total.toLocaleString()} recorded activities`}>
                <div><strong>{total.toLocaleString('en-US')}</strong><small>Total activities</small></div>
            </div>
            <div className="pm-admin-overview-legend">
                {items.map((item, i) => <div key={item.label} className="pm-admin-overview-legend-row">
                    <span className="pm-admin-overview-dot" style={{ background: colors[i % colors.length] }} aria-hidden="true"/>
                    <span>{item.label}</span><strong>{total ? `${(item.value / total * 100).toFixed(1)}%` : '0%'}</strong>
                </div>)}
            </div>
        </div>
    </DashboardCard>;
}
