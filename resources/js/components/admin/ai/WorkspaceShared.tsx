import { Link } from '@inertiajs/react';
import { Info, CircleDot, Sparkles, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const money = (n: number | string | null | undefined) => n == null ? 'Not tracked' : `$${Number(n).toFixed(2)}`;
export const count = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString();
export const providerLabel = (provider: string) => provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google Gemini' : provider === 'anthropic' ? 'Anthropic' : provider;
export function Button({children, onClick, primary, disabled, type = 'button'}: {children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; type?: 'button' | 'submit'}) {
    return <button type={type} className={`pm-admin-button${primary ? ' pm-admin-button-primary' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
export function ActionLink({href, children, primary}: {href: string; children: ReactNode; primary?: boolean}) {
    return <Link href={href} className={`pm-admin-button${primary ? ' pm-admin-button-primary' : ''}`}>{children}</Link>;
}
export function Notice({children}: {children: ReactNode}) {
    return <div className="pm-ai-workspace-notice"><Info size={18} aria-hidden="true"/><div>{children}</div></div>;
}
export function Panel({title, description, action, children, table = false}: {title: string; description?: string; action?: ReactNode; children: ReactNode; table?: boolean}) {
    return <section className="pm-admin-panel pm-ai-workspace-panel"><header><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header><div className={table ? 'pm-ai-workspace-table-body' : 'pm-ai-workspace-body'}>{children}</div></section>;
}
export function Metric({label, value, description, icon: Icon}: {label: string; value: ReactNode; description: ReactNode; icon: LucideIcon}) {
    return <div className="pm-admin-panel pm-ai-workspace-metric"><div className="pm-admin-stat-head">{label}<span className="pm-ai-workspace-icon"><Icon size={19} aria-hidden="true"/></span></div><strong className="pm-admin-stat-number">{value}</strong><span className="pm-ai-admin-muted">{description}</span></div>;
}
export function Status({value}: {value: string}) {
    const tone = ['Active', 'Approved', 'OPERATION_VERIFIED', 'RUNTIME_RECOVERED', 'completed'].includes(value) ? 'good' : ['Standby', 'Price missing', 'Not tested', 'Not configured', 'ACCESS_VERIFIED', 'TEST_PENDING', 'MODEL_NOT_CONFIGURED', 'MODEL_PRICE_MISSING'].includes(value) ? 'warn' : ['Disabled', 'failed', 'provider_status_unknown', 'AUTH_OR_SCOPE_DENIED', 'PROVIDER_RATE_LIMITED', 'PROVIDER_UNAVAILABLE', 'CONNECTION_UNAVAILABLE', 'INVALID_RESPONSE', 'PROVIDER_AUTH_FAILED', 'PROVIDER_PERMISSION_DENIED', 'PROVIDER_QUOTA_EXHAUSTED', 'PROVIDER_MODEL_NOT_FOUND', 'PROVIDER_STATUS_UNKNOWN', 'PROVIDER_FAILURE', 'BUDGET_NOT_CONFIGURED', 'DAILY_AI_BUDGET_REACHED', 'MONTHLY_AI_BUDGET_REACHED', 'FEATURE_AI_BUDGET_REACHED', 'POST_CHECK_KEY_DENIED', 'POST_CHECK_RATE_LIMITED'].includes(value) ? 'bad' : '';
    return <span className={`pm-ai-workspace-pill ${tone}`}><i aria-hidden="true"/>{value === 'OPERATION_VERIFIED' ? 'Operation verified' : value === 'ACCESS_VERIFIED' ? 'Access verified · retest' : value.replaceAll('_', ' ')}</span>;
}
export function ProviderIcon({provider}: {provider: string}) {
    return <span className={`pm-ai-workspace-icon pm-ai-workspace-provider-icon ${provider==='openai'?'openai':provider==='gemini'?'gemini':'anthropic'}`}>{provider==='openai'?<CircleDot size={21} aria-hidden="true"/>:provider==='gemini'?<Sparkles size={21} aria-hidden="true"/>:<span aria-hidden="true">A</span>}</span>;
}
export function Provider({provider, name}: {provider: string; name?: string}) {
    return <span className="pm-ai-workspace-provider"><ProviderIcon provider={provider}/><strong>{name??providerLabel(provider)}</strong></span>;
}
export function Table({columns, rows}: {columns: string[]; rows: ReactNode[][]}) {
    return <div className="pm-ai-admin-table-wrap pm-ai-workspace-table"><table><thead><tr>{columns.map(col => <th key={col} scope="col">{col}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length} className="pm-ai-workspace-empty">No matching records.</td></tr>}</tbody></table></div>;
}
export function Meter({value, limit}: {value: number; limit: number}) {
    return <div className="pm-ai-usage-track" role="progressbar" aria-label="Daily budget utilization" aria-valuemin={0} aria-valuemax={100} aria-valuenow={limit > 0 ? Math.min(100, Math.round(value / limit * 100)) : 0}><span style={{width: `${limit > 0 ? Math.min(100, value / limit * 100) : 0}%`}}/></div>;
}
export function ActivityChart({days}: {days: {day: string; interactive: number; editorial: number}[]}) {
    const maximum = Math.max(1, ...days.flatMap(day => [day.interactive, day.editorial]));
    return <><div className="pm-ai-workspace-legend"><span><i/>Interactive</span><span><i/>Editorial &amp; moderation</span></div><div className="pm-ai-workspace-chart" aria-label="Request activity for the last seven UTC days">{days.map((day, i) => <div key={i}><div className="pm-ai-workspace-bars"><span title={`${day.day}: ${day.interactive} interactive`} style={{height: `${day.interactive / maximum * 100}%`}}/><span title={`${day.day}: ${day.editorial} editorial and moderation`} style={{height: `${day.editorial / maximum * 100}%`}}/></div><small>{day.day}</small></div>)}</div></>;
}
