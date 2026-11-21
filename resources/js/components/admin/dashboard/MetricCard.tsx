import type { LucideIcon } from 'lucide-react';
import type { DashboardMetric } from '@/types/admin-dashboard';

const number = (value: number) => value.toLocaleString('en-US');

export function MetricCard({ label, metric, icon: Icon }: { label: string; metric: DashboardMetric; icon: LucideIcon }) {
    const change = metric.change;
    return <article className="pm-admin-overview-metric pm-admin-panel" aria-label={`${label}: ${number(metric.value)}`}>
        <div className="pm-admin-overview-metric-head">
            <span className="pm-admin-overview-icon"><Icon size={22} strokeWidth={1.9} aria-hidden="true"/></span>
            <div><span className="pm-admin-overview-metric-title">{label}</span>
                <strong className="pm-admin-overview-metric-value">{number(metric.value)}</strong></div>
        </div>
        <div className="pm-admin-overview-metric-foot">
            {change !== null ? <span className={`pm-admin-overview-change ${change < 0 ? 'is-negative' : ''}`}>{change > 0 ? '+' : ''}{change}%</span>
                : metric.current !== undefined ? <span className="pm-admin-overview-change is-neutral">+{number(metric.current)}</span> : null}
            <small>{metric.note}</small>
        </div>
    </article>;
}
