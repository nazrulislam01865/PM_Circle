import { Head, router } from '@inertiajs/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Coins, Gauge, Plus, RefreshCw, Search, ShieldCheck, UsersRound } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AiFeatureSelect, AiMonthlyCreditEditor, AiPlanPolicyEditor, type AiPolicy, type AiAllowance, type AiHardLimits, type FeatureScope, type PlanCode } from '@/components/admin/ai/AiAllocationEditors';

type Permission = { quotas: boolean; credits: boolean };
type Policy = AiPolicy;
type Override = {
    id: number; user_id: number; member_name: string; member_email: string; feature_scope: string;
    status: string; starts_at_utc: string; ends_at_utc: string | null;
    max_daily: number | null; max_cycle: number | null; max_per_conversation: number | null;
    max_concurrent: number | null; max_cycle_tokens: number | null; reason: string;
};
type Allowance = AiAllowance;
type Audit = { id: number; action: string; subject_type: string; subject_id: number; reason: string; actor_name: string | null; created_at: string };
type FeatureUsage = { feature_code: string; status: string; total: number; tokens: number; cost_usd: string | number };
type UsageWindow = { used: number; pending: number; limit: number; reset_at?: string };
type TokenWindow = { allocated: number; used: number; pending: number; remaining: number; reset_at: string };
type MemberLimits = { enabled: boolean; code?: string; daily?: UsageWindow; cycle?: UsageWindow; tokens?: TokenWindow };
type Member = { id: number; name: string; email: string };
type MemberDetail = {
    member: Member; plan: string; limits: { pmp: MemberLimits; ask_ai: MemberLimits };
    wallet: { available: number; reserved: number; spent_lifetime: number };
    requests: { request_uuid: string; feature_code: string; status: string; input_tokens: number;
        output_tokens: number; final_charge: number; cost_usd: string | number | null; created_at: string }[];
};
type Props = {
    capabilities: Permission;
    configuration: { enabled: boolean; hard_limits: AiHardLimits };
    totals: { total_requests: number; input_tokens: number; output_tokens: number; member_credits: number; cost_usd: number | string };
    byFeature: FeatureUsage[]; policies: Policy[]; overrides: Override[]; allowances: Allowance[]; audit: Audit[];
};
type Tab = 'overview' | 'plans' | 'members' | 'reports';
type ApiError = { message?: string; errors?: Record<string, string[]>; code?: string };
const fmt = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString();
const utcMillis = (value: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).getTime();
const dateLabel = (value: string | null | undefined) => value ? new Date(utcMillis(value)).toLocaleString() : 'No expiry';
const fromLocal = (value: string) => value ? new Date(value).toISOString() : '';
const localDateTime = (offsetMinutes = 5) => {
    const date = new Date(Date.now() + offsetMinutes * 60_000);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

async function api<T>(path: string, options: { method?: string; data?: unknown } = {}): Promise<T> {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(path, {
        method: options.method ?? 'GET', credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
        ...(options.data === undefined ? {} : { body: JSON.stringify(options.data) }),
    });
    const payload = await response.json().catch(() => ({})) as ApiError;
    if (!response.ok) {
        const validation = payload.errors ? Object.entries(payload.errors).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join(' · ') : '';
        throw new Error(validation || payload.message || payload.code || `Request failed (${response.status}).`);
    }
    return payload as T;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
    return <label className="pm-admin-field"><span>{label}</span>{children}{hint && <small className="pm-admin-hint">{hint}</small>}</label>;
}
function UsageMeter({ title, used, pending, limit }: { title: string; used: number; pending: number; limit: number }) {
    const percentage = limit > 0 ? Math.min(100, ((used + pending) / limit) * 100) : 0;
    return <div className="pm-ai-usage-meter">
        <div><strong>{title}</strong><span>{fmt(used)} used · {fmt(pending)} pending · {fmt(Math.max(0, limit - used - pending))} remaining / {fmt(limit)}</span></div>
        <div className="pm-ai-usage-track" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={Math.max(limit, 1)} aria-valuenow={Math.min(used + pending, Math.max(limit, 1))}><span style={{ width: `${percentage}%` }}/></div>
    </div>;
}

export default function AiUsageManagement({ capabilities, configuration, totals, byFeature, policies, overrides, allowances, audit }: Props) {
    const [tab, setTab] = useState<Tab>('overview');
    const [busy, setBusy] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
    const [search, setSearch] = useState('');
    const [candidates, setCandidates] = useState<Member[]>([]);
    const [selected, setSelected] = useState<MemberDetail | null>(null);
    const [override, setOverride] = useState({ feature_scope: 'feature:pmp', max_daily: '', max_cycle: '', max_per_conversation: '',
        max_concurrent: '', max_cycle_tokens: '', starts_at_utc: localDateTime(0), ends_at_utc: '', reason: '' });
    const [grant, setGrant] = useState({ credits: '', external_reference: '', expires_at: '', reason: '' });
    const [revokeReasons, setRevokeReasons] = useState<Record<number, string>>({});

    const refresh = () => router.reload({ only: ['totals', 'byFeature', 'policies', 'overrides', 'allowances', 'audit'] });
    async function act<T>(key: string, action: () => Promise<T>, success: string, after?: () => Promise<void> | void) {
        if (busy) return;
        setBusy(key);
        setNotice(null);
        try {
            await action();
            setNotice({ kind: 'success', text: success });
            if (after) await after();
            refresh();
        } catch (error) {
            setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Request failed.' });
        } finally {
            setBusy(null);
        }
    }
    async function loadMember(id: number): Promise<void> {
        const result = await api<MemberDetail>(`/admin/ai/usage-management/members/${id}`);
        setSelected(result);
    }
    async function findMember(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (search.trim().length < 2 || busy) return;
        setBusy('search'); setNotice(null);
        try {
            const result = await api<{ members: Member[] }>(`/admin/ai/usage-management/members?q=${encodeURIComponent(search.trim())}`);
            setCandidates(result.members);
        } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Member lookup failed.' }); }
        finally { setBusy(null); }
    }
    const latestPolicies = (['free', 'plus', 'pro'] as const).flatMap(plan => ['feature:pmp', 'feature:ask_ai'].map(scope => {
        const rows = policies.filter(item => item.plan_code === plan && item.feature_scope === scope);
        const active = rows.filter(item => item.enabled && utcMillis(item.active_from_utc) <= Date.now())
            .sort((a, b) => utcMillis(b.active_from_utc) - utcMillis(a.active_from_utc) || b.version - a.version)[0];
        const upcoming = rows.filter(item => utcMillis(item.active_from_utc) > Date.now())
            .sort((a, b) => utcMillis(a.active_from_utc) - utcMillis(b.active_from_utc))[0];
        return { plan, scope, active, upcoming };
    }));
    const latestAllowances = (['plus', 'pro'] as const).map(plan => ({
        plan,
        record: allowances.filter(item => item.plan_code === plan && utcMillis(item.active_from_utc) <= Date.now())
            .sort((a, b) => utcMillis(b.active_from_utc) - utcMillis(a.active_from_utc) || b.version - a.version)[0],
        upcoming: allowances.filter(item => item.plan_code === plan && utcMillis(item.active_from_utc) > Date.now())
            .sort((a, b) => utcMillis(a.active_from_utc) - utcMillis(b.active_from_utc))[0],
    }));
    const allDisabled = !configuration.enabled;

    return <AdminLayout active="/admin/ai/usage-management" title="AI usage management" subtitle="Manage member AI usage, limits and token allocations without changing subscription prices.">
        <Head title="AI usage management | PM Circle" />
        <div className="pm-ai-admin-topline"><div className={`pm-ai-admin-status ${allDisabled ? 'is-warning' : ''}`}>
            {allDisabled ? <AlertTriangle size={17}/> : <ShieldCheck size={17}/>}
            {allDisabled ? 'AI gateway is disabled by server configuration.' : 'AI gateway is enabled. Backend limits are enforced.'}
        </div><button type="button" className="pm-admin-button" onClick={refresh}><RefreshCw size={16}/> Refresh data</button></div>
        {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} className={`pm-admin-notice pm-admin-notice-${notice.kind}`}>
            {notice.kind === 'success' ? <CheckCircle2 size={17}/> : <AlertTriangle size={17}/>} {notice.text}
        </div>}
        <nav className="pm-ai-admin-tabs" aria-label="AI management sections">
            {([['overview', 'Overview'], ['plans', 'Plan allocations'], ['members', 'Member usage & overrides'], ['reports', 'Reports & audit']] as [Tab, string][]).map(([key, text]) =>
                <button type="button" key={key} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'is-active' : ''}>{text}</button>)}
        </nav>
        {tab === 'overview' && <>
            <div className="pm-admin-stats">
                {[
                    { label: 'Requests · last 30 days', value: fmt(totals.total_requests), Icon: Activity },
                    { label: 'Provider tokens · last 30 days', value: fmt(Number(totals.input_tokens) + Number(totals.output_tokens)), Icon: Gauge },
                    { label: 'Member credits used', value: fmt(totals.member_credits), Icon: Coins },
                    { label: 'Estimated provider cost (USD)', value: `$${Number(totals.cost_usd).toFixed(4)}`, Icon: Clock3 },
                ].map(({ label, value, Icon }) => <article className="pm-admin-panel pm-admin-stat" key={label}>
                    <div className="pm-admin-stat-head">{label}<Icon size={19} aria-hidden="true"/></div><strong className="pm-admin-stat-number">{value}</strong>
                </article>)}
            </div>
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Current usage policies</h2><p>Effective versions are enforced server-side. Changes create future-effective versions; historical usage is preserved.</p></div>
                <div className="pm-ai-admin-table-wrap"><table><thead><tr><th>Plan</th><th>Feature</th><th>Daily / cycle</th><th>Per chat</th><th>Concurrent</th><th>Tokens / cycle</th><th>Next change</th></tr></thead>
                    <tbody>{latestPolicies.map(item => <tr key={`${item.plan}-${item.scope}`}>
                        <td><strong className="pm-ai-admin-capitalize">{item.plan}</strong></td><td>{item.scope === 'feature:pmp' ? 'PMP tutor' : 'Ask AI'}</td>
                        <td>{item.active ? `${fmt(item.active.max_daily)} / ${fmt(item.active.max_cycle)}` : 'Not configured'}</td>
                        <td>{item.active ? fmt(item.active.max_per_conversation) : '—'}</td><td>{item.active ? fmt(item.active.max_concurrent) : '—'}</td>
                        <td>{item.scope === 'feature:pmp' ? (item.active ? fmt(item.active.max_cycle_tokens) : '—') : 'Not applicable'}</td>
                        <td>{item.upcoming ? dateLabel(item.upcoming.active_from_utc) : '—'}</td>
                    </tr>)}</tbody></table></div>
            </section>
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Operating safeguards</h2><p>Limits below are system-wide ceilings, even if an administrator allocates more.</p></div>
                <div className="pm-ai-admin-ceilings">{Object.entries(configuration.hard_limits).map(([key, value]) => <div key={key}><span>{key.replaceAll('_', ' ')}</span><strong>{fmt(value)}</strong></div>)}</div>
                <p className="pm-admin-hint">An OpenAI API project spending limit is separate from PM Circle member tokens, replies, and credits. No API key or private chat content is displayed here.</p>
            </section>
        </>}
        {tab === 'plans' && <>
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>How AI limits work</h2><p>Set Plus and Pro independently. These settings govern server-side member usage, not OpenAI API spending or subscription prices.</p></div>
                <div className="pm-ai-admin-explainer">
                    <div><strong>PMP question tutor</strong><span>Chat about the selected completed PMP exam question and its explanations. This is the feature currently used in the exam review.</span></div>
                    <div><strong>Ask AI (general assistant)</strong><span>A separate AI conversation feature. Its reply-count rules do not allocate PMP tutoring tokens, and a policy does not enable the feature itself.</span></div>
                    <div><strong>Tokens / billing cycle</strong><span>Maximum model input + output tokens for PMP tutoring, including reasoning. The member dashboard shows allocated, used, reserved and remaining tokens.</span></div>
                    <div><strong>Reply & concurrency limits</strong><span>Daily, cycle, per-conversation and in-progress request caps; all are checked by Laravel on each request.</span></div>
                </div>
            </section>
            {!capabilities.quotas ? <p className="pm-admin-notice pm-admin-notice-error">You have read-only AI report access. A separate quota permission is required to change plan allocations.</p> : <>
                <div className="pm-ai-admin-plan-grid" aria-label="Separate Plus and Pro AI allocations">
                    {(['plus', 'pro'] as const).map(plan => <AiPlanPolicyEditor key={plan} plan={plan} policies={policies} limits={configuration.hard_limits}
                        busy={busy !== null} onSave={(code: PlanCode, data: Record<string, unknown>) => act(`policy-${code}`, () => api('/admin/ai/chat-limits/policies', { method: 'POST', data }), `${code.toUpperCase()} usage policy published.`)}/>)}
                </div>
                <details className="pm-admin-panel pm-ai-admin-section pm-ai-admin-free-section"><summary>Free plan AI limits (optional)</summary>
                    <p className="pm-admin-hint">Publishing a Free policy does not grant Free members access to paid AI tutoring.</p>
                    <AiPlanPolicyEditor plan="free" policies={policies} limits={configuration.hard_limits} busy={busy !== null}
                        onSave={(code: PlanCode, data: Record<string, unknown>) => act(`policy-${code}`, () => api('/admin/ai/chat-limits/policies', { method: 'POST', data }), 'Free plan usage policy published.')}/>
                </details>
            </>}
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Plus / Pro member credit allowances</h2><p>Optional. Member credits are a PM Circle billing unit, separate from model tokens. Changing an allowance does not issue tokens or change OpenAI billing.</p></div>
                <div className="pm-ai-admin-plan-grid">
                    {(['plus', 'pro'] as const).map(plan => capabilities.credits
                        ? <AiMonthlyCreditEditor key={plan} plan={plan} record={latestAllowances.find(item => item.plan === plan)?.record} upcoming={latestAllowances.find(item => item.plan === plan)?.upcoming}
                            busy={busy !== null} onSave={(code, data) => act(`credits-${code}`, () => api('/admin/ai/allowances', { method: 'POST', data }), `${code.toUpperCase()} monthly member credit allowance published.`)}/>
                        : <div className="pm-ai-admin-credit-card" key={plan}><strong>{plan.toUpperCase()}</strong><p className="pm-admin-hint">{latestAllowances.find(item => item.plan === plan)?.record?.monthly_credits ?? 'Not configured'} credits/month. Requires credit-management permission to edit.</p></div>)}
                </div>
            </section>
        </>}
        {tab === 'members' && <>
            {!capabilities.quotas ? <p className="pm-admin-notice pm-admin-notice-error">Member lookup requires the AI quota management permission.</p> : <>
                <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>User-based AI usage and allocation</h2><p>Find a member to see their own Plus/Pro limits, allocated/consumed/remaining tokens, requests and individual overrides. Search results are limited, and private AI messages are never shown.</p></div>
                    <form className="pm-ai-admin-search" onSubmit={findMember}><input aria-label="Member name or email" placeholder="Enter at least two characters" minLength={2} maxLength={80} value={search} onChange={e => setSearch(e.target.value)}/>
                        <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy !== null || search.trim().length < 2}><Search size={17}/>{busy === 'search' ? 'Searching…' : 'Find member'}</button></form>
                    {candidates.length > 0 && <div className="pm-ai-admin-results">{candidates.map(member => <button key={member.id} className={selected?.member.id === member.id ? 'is-active' : ''} type="button" onClick={() => void act('member', () => loadMember(member.id), `Loaded member #${member.id}.`)}>
                        <UsersRound size={17}/><span><strong>{member.name}</strong><small>{member.email} · ID {member.id}</small></span></button>)}</div>}
                    {search.trim().length >= 2 && candidates.length === 0 && busy !== 'search' && <p className="pm-admin-hint">Select Find member to search, or refine your query if no results appear.</p>}
                </section>
                {selected && <>
                    <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>{selected.member.name} · {selected.plan.toUpperCase()} plan</h2><p>{selected.member.email} · Member #{selected.member.id}</p></div>
                        <div className="pm-ai-admin-member-usage">
                            {(['pmp', 'ask_ai'] as const).map(feature => { const values = selected.limits[feature]; return <div className="pm-ai-admin-member-feature" key={feature}><h3>{feature === 'pmp' ? 'PMP question tutor' : 'Ask AI (general assistant)'}</h3>
                                {values.enabled ? <>{values.daily && <UsageMeter title="Daily replies" used={values.daily.used} pending={values.daily.pending} limit={values.daily.limit}/>}
                                    {values.cycle && <UsageMeter title="Cycle replies" used={values.cycle.used} pending={values.cycle.pending} limit={values.cycle.limit}/>}
                                    {values.tokens && <><div className="pm-ai-admin-token-summary"><div><span>Allocated</span><strong>{fmt(values.tokens.allocated)}</strong></div><div><span>Used</span><strong>{fmt(values.tokens.used)}</strong></div><div><span>Reserved</span><strong>{fmt(values.tokens.pending)}</strong></div><div><span>Remaining</span><strong>{fmt(values.tokens.remaining)}</strong></div></div><UsageMeter title="Billing-cycle tokens" used={values.tokens.used} pending={values.tokens.pending} limit={values.tokens.allocated}/></>}</>
                                    : <p className="pm-admin-hint">{values.code === 'NOT_ENTITLED' ? 'This member is not currently entitled to use this AI feature. An allocation does not grant membership.' : 'No effective plan policy. Configure an active policy first.'}</p>}</div>; })}
                        </div>
                        <p className="pm-admin-hint">Wallet: {fmt(selected.wallet.available)} available · {fmt(selected.wallet.reserved)} reserved · {fmt(selected.wallet.spent_lifetime)} spent credits.</p>
                        <button type="button" className="pm-admin-button" disabled={busy !== null} onClick={() => void act('member', () => loadMember(selected.member.id), 'Member usage refreshed.')}><RefreshCw size={16}/> Refresh member usage</button>
                    </section>
                    <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Allocate usage to this member</h2><p>Change this member's own reply or token limits without changing the Plus / Pro plan. An entered number <strong>replaces</strong> the plan limit for that dimension; blank fields keep the plan value. Overlapping active overrides are rejected.</p></div>
                        <form className="pm-ai-admin-form" onSubmit={event => { event.preventDefault(); const limits = Object.fromEntries((['max_daily', 'max_cycle', 'max_per_conversation', 'max_concurrent', 'max_cycle_tokens'] as const)
                            .filter(key => (override.feature_scope === 'feature:pmp' || key !== 'max_cycle_tokens') && override[key].trim() !== '').map(key => [key, Number(override[key])]));
                            void act('override', () => api('/admin/ai/chat-limits/overrides', { method: 'POST', data: {
                                user_id: selected.member.id, feature_scope: override.feature_scope, ...limits,
                                starts_at_utc: fromLocal(override.starts_at_utc), ends_at_utc: override.ends_at_utc ? fromLocal(override.ends_at_utc) : null, reason: override.reason.trim(),
                            } }), 'Member override created and audited.', () => loadMember(selected.member.id));
                        }}>
                            <div className="pm-admin-field-grid">
                                <Field label="AI feature"><AiFeatureSelect value={override.feature_scope as FeatureScope} onChange={next => setOverride(old => ({ ...old, feature_scope: next, ...(next !== 'feature:pmp' ? { max_cycle_tokens: '' } : {}) }))}/></Field>
                                <Field label="Effective from"><input type="datetime-local" required value={override.starts_at_utc} onChange={e => setOverride({ ...override, starts_at_utc: e.target.value })}/></Field>
                                <Field label="Expires at (optional)"><input type="datetime-local" value={override.ends_at_utc} onChange={e => setOverride({ ...override, ends_at_utc: e.target.value })}/></Field>
                                {([['max_daily', 'Daily replies', configuration.hard_limits.daily], ['max_cycle', 'Cycle replies', configuration.hard_limits.cycle],
                                    ['max_per_conversation', 'Replies / chat', configuration.hard_limits.conversation], ['max_concurrent', 'Concurrent requests', configuration.hard_limits.concurrent],
                                    ...(override.feature_scope === 'feature:pmp' ? [['max_cycle_tokens', 'Member tokens per billing cycle (replaces plan value)', configuration.hard_limits.pmp_tokens] as const] : [])] as const)
                                    .map(([key, label, max]) => <Field label={label} key={key}><input type="number" min="0" max={max} step="1" placeholder="Inherit from plan" value={override[key]} onChange={e => setOverride({ ...override, [key]: e.target.value })}/></Field>)}
                            </div>
                            <Field label="Override reason"><textarea required maxLength={500} value={override.reason} onChange={e => setOverride({ ...override, reason: e.target.value })}/></Field>
                            <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy !== null || ![override.max_daily, override.max_cycle, override.max_per_conversation, override.max_concurrent, override.max_cycle_tokens].some(Boolean)}>
                                <Plus size={16}/> {busy === 'override' ? 'Saving…' : 'Create member override'}</button>
                        </form>
                    </section>
                    {capabilities.credits && <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Manual credit adjustment</h2><p>Audited, idempotent credit grant. Maximum 500 credits per action. This does not sell credits or modify provider tokens.</p></div>
                        <form className="pm-ai-admin-form" onSubmit={event => { event.preventDefault(); void act('grant', () => api('/admin/ai/credits/grants', { method: 'POST', data: {
                            user_id: selected.member.id, credits: Number(grant.credits), external_reference: grant.external_reference.trim(),
                            expires_at: grant.expires_at ? fromLocal(grant.expires_at) : null, reason: grant.reason.trim(),
                        } }), 'Credit grant request completed; repeated references are idempotent.', () => loadMember(selected.member.id)); }}>
                            <div className="pm-admin-field-grid">
                                <Field label="Credits to grant"><input required type="number" min="1" max="500" value={grant.credits} onChange={e => setGrant({ ...grant, credits: e.target.value })}/></Field>
                                <Field label="Unique external reference" hint="Must be unique for each credit grant to prevent duplicate issuance. Short references are accepted."><input required maxLength={110} value={grant.external_reference} placeholder="e.g. support-credit-2026-001" onChange={e => setGrant({ ...grant, external_reference: e.target.value })}/></Field>
                                <Field label="Expiry (optional)"><input type="datetime-local" value={grant.expires_at} onChange={e => setGrant({ ...grant, expires_at: e.target.value })}/></Field>
                            </div><Field label="Grant reason"><textarea required maxLength={500} value={grant.reason} onChange={e => setGrant({ ...grant, reason: e.target.value })}/></Field>
                            <button type="submit" className="pm-admin-button pm-admin-button-primary" disabled={busy !== null}><Coins size={17}/> {busy === 'grant' ? 'Granting…' : 'Grant credits'}</button>
                        </form>
                    </section>}
                    <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Recent AI requests</h2><p>Only request metadata, never private chat messages or prompts.</p></div>
                        <div className="pm-ai-admin-table-wrap"><table><thead><tr><th>Time</th><th>Feature</th><th>Status</th><th>Provider tokens</th><th>Member credits</th><th>Provider cost</th></tr></thead><tbody>
                            {selected.requests.map(r => <tr key={r.request_uuid}><td>{dateLabel(r.created_at)}</td><td>{r.feature_code}</td><td>{r.status}</td><td>{fmt(r.input_tokens + r.output_tokens)}</td><td>{fmt(r.final_charge)}</td><td>${Number(r.cost_usd ?? 0).toFixed(5)}</td></tr>)}
                            {selected.requests.length === 0 && <tr><td colSpan={6}>No recent requests.</td></tr>}
                        </tbody></table></div>
                    </section>
                </>}
                <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Recent member overrides</h2><p>Most recent 40; revoke active overrides with an audited reason.</p></div>
                    <div className="pm-ai-admin-table-wrap"><table><thead><tr><th>Member</th><th>Feature</th><th>Status</th><th>Starts</th><th>Expires</th><th>Action</th></tr></thead><tbody>
                        {overrides.map(item => <tr key={item.id}><td>{item.member_name}<small className="pm-ai-admin-muted">{item.member_email}</small></td><td>{item.feature_scope.replace('feature:', '')}</td><td>{item.status}</td><td>{dateLabel(item.starts_at_utc)}</td><td>{dateLabel(item.ends_at_utc)}</td>
                            <td>{item.status === 'active' && <div className="pm-ai-admin-revoke"><input aria-label={`Reason to revoke override ${item.id}`} placeholder="Reason for revocation" maxLength={500} value={revokeReasons[item.id] ?? ''} onChange={e => setRevokeReasons(old => ({ ...old, [item.id]: e.target.value }))}/>
                                <button className="pm-admin-button" type="button" disabled={busy !== null || (revokeReasons[item.id] ?? '').trim().length === 0} onClick={() => void act(`revoke:${item.id}`,
                                    () => api(`/admin/ai/chat-limits/overrides/${item.id}/revoke`, { method: 'POST', data: { reason: revokeReasons[item.id].trim() } }),
                                    'Override revoked.', selected?.member.id === item.user_id ? () => loadMember(item.user_id) : undefined)}>{busy === `revoke:${item.id}` ? 'Revoking…' : 'Revoke'}</button></div>}</td></tr>)}
                        {overrides.length === 0 && <tr><td colSpan={6}>No member overrides.</td></tr>}
                    </tbody></table></div>
                </section>
            </>}
        </>}
        {tab === 'reports' && <>
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Feature usage · last 30 days</h2><p>Aggregated provider usage and costs. No member message content is included.</p></div>
                <div className="pm-ai-admin-table-wrap"><table><thead><tr><th>Feature</th><th>Status</th><th>Requests</th><th>Tokens</th><th>Provider cost (USD)</th></tr></thead><tbody>
                    {byFeature.map(row => <tr key={`${row.feature_code}:${row.status}`}><td>{row.feature_code}</td><td>{row.status}</td><td>{fmt(row.total)}</td><td>{fmt(row.tokens)}</td><td>${Number(row.cost_usd).toFixed(5)}</td></tr>)}
                    {byFeature.length === 0 && <tr><td colSpan={5}>No AI requests in the last 30 days.</td></tr>}
                </tbody></table></div></section>
            <section className="pm-admin-panel pm-ai-admin-section"><div className="pm-ai-admin-section-heading"><h2>Recent administrator audit events</h2><p>Read-only change history. Stored hashes protect before/after snapshots; request payloads are never displayed.</p></div>
                <div className="pm-ai-admin-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Reason</th></tr></thead><tbody>
                    {audit.map(row => <tr key={row.id}><td>{dateLabel(row.created_at)}</td><td>{row.actor_name ?? 'System / deleted user'}</td><td>{row.action}</td><td>{row.reason}</td></tr>)}
                    {audit.length === 0 && <tr><td colSpan={4}>No recorded changes.</td></tr>}
                </tbody></table></div>
            </section>
        </>}
    </AdminLayout>;
}
