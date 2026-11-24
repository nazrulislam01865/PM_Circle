import { useMemo, useState } from 'react';
import type { DashboardSeriesPoint } from '@/types/admin-dashboard';
import { DashboardCard } from './DashboardCard';

const fmt = (value: number) => value.toLocaleString('en-US');
const short = (value: number) => value >= 1000 ? `${Number((value / 1000).toFixed(1))}K` : String(value);
const prettyDate = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function ActivityChart({ series, timezone }: { series: DashboardSeriesPoint[]; timezone: string }) {
    const [mode, setMode] = useState<'activity' | 'members'>('activity');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const values = useMemo(() => series.map(item => Number(item[mode]) || 0), [series, mode]);
    const max = Math.max(1, ...values);
    const ceiling = Math.max(4, Math.ceil(max / 4) * 4);
    const x = (idx: number) => 44 + (idx / Math.max(series.length - 1, 1)) * 540;
    const y = (value: number) => 204 - (value / ceiling) * 170;
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
    const area = values.length ? `M ${x(0)} 204 L ${points.replaceAll(' ', ' L ')} L ${x(values.length - 1)} 204 Z` : '';
    const selectedIndex = series.findIndex(item => item.date === selectedDate);
    const chosenIndex = selectedIndex >= 0 ? selectedIndex : Math.max(series.length - 1, 0);
    const selected = series[chosenIndex];
    const labelEvery = Math.ceil(series.length / 7);

    return <DashboardCard title="Platform activity" subtitle={`Recorded platform events · ${timezone} dates`} className="pm-admin-overview-chart-card" action={
        <div className="pm-admin-overview-segment" aria-label="Platform chart series">
            <button type="button" className={mode === 'activity' ? 'is-active' : ''} aria-pressed={mode === 'activity'} onClick={() => { setMode('activity'); setSelectedDate(null); }}>Activity</button>
            <button type="button" className={mode === 'members' ? 'is-active' : ''} aria-pressed={mode === 'members'} onClick={() => { setMode('members'); setSelectedDate(null); }}>Members</button>
        </div>}>
        {series.length === 0 ? <p className="pm-admin-overview-empty">No activity data is available.</p> : <>
            <div className="pm-admin-overview-chart-detail" aria-live="polite">{selected ? `${prettyDate(selected.date)} · ${fmt(selected[mode])} ${mode === 'members' ? 'new members' : 'activities'}` : ''}</div>
            <svg className="pm-admin-overview-svg-chart" viewBox="0 0 600 246" role="img" aria-label={`${mode === 'activity' ? 'Platform events' : 'New members'} over ${series.length} days`} preserveAspectRatio="xMidYMid meet">
                <defs><linearGradient id="pm-admin-overview-activity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--blue)" stopOpacity=".26"/><stop offset="100%" stopColor="var(--blue)" stopOpacity=".025"/></linearGradient></defs>
                {[0, 1, 2, 3, 4].map(step => <g key={step}>
                    <line x1="44" x2="584" y1={204 - (step * 170 / 4)} y2={204 - (step * 170 / 4)} stroke="var(--border)" strokeDasharray="3 4"/>
                    <text x="35" y={208 - (step * 170 / 4)} fill="var(--muted)" style={{ fontSize: 'var(--text-metric-caption)' }} textAnchor="end">{short((ceiling * step) / 4)}</text>
                </g>)}
                <path d={area} fill="url(#pm-admin-overview-activity-fill)"/>
                <polyline points={points} fill="none" stroke="var(--blue)" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
                {values.map((value, index) => <g key={series[index].date}>
                    <circle cx={x(index)} cy={y(value)} r="9" fill="transparent" onMouseEnter={() => setSelectedDate(series[index].date)} onClick={() => setSelectedDate(series[index].date)}>
                        <title>{`${prettyDate(series[index].date)}: ${fmt(value)}`}</title>
                    </circle>
                    {(index % labelEvery === 0 || index === values.length - 1) && <text x={x(index)} y="230" style={{ fontSize: 'var(--text-metric-caption)' }} textAnchor="middle" fill="var(--muted)">{prettyDate(series[index].date)}</text>}
                </g>)}
                <circle cx={x(chosenIndex)} cy={y(values[chosenIndex])} r="5.5" fill="var(--blue)" stroke="var(--surface)" strokeWidth="2"/>
            </svg>
        </>}
    </DashboardCard>;
}
