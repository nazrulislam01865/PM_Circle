import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PlanCode = 'free' | 'plus' | 'pro';
export type FeatureScope = 'feature:pmp' | 'feature:ask_ai';
export type AiPolicy = {
    id: number; plan_code: string; feature_scope: string; version: number; enabled: boolean;
    max_daily: number; max_cycle: number; max_per_conversation: number; max_concurrent: number;
    max_cycle_tokens: number | null; active_from_utc: string;
};
export type AiAllowance = { id: number; plan_code: string; version: number; monthly_credits: number; active_from_utc: string };
export type AiHardLimits = { daily: number; cycle: number; conversation: number; concurrent: number; pmp_tokens: number };

const fmt = (value: number | string | null | undefined) => Number(value ?? 0).toLocaleString();
const utcFromLocal = (value: string) => new Date(value).toISOString();
const utcMillis = (value: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`).getTime();
const dateLocal = () => {
    const value = new Date(Date.now() + 5 * 60_000);
    return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const activePolicy = (policies: AiPolicy[], plan: PlanCode, scope: FeatureScope) => policies
    .filter(policy => policy.enabled && policy.plan_code === plan && policy.feature_scope === scope && utcMillis(policy.active_from_utc) <= Date.now())
    .sort((a, b) => utcMillis(b.active_from_utc) - utcMillis(a.active_from_utc) || b.version - a.version)[0];

type PolicyDraft = {
    max_daily: string; max_cycle: string; max_per_conversation: string; max_concurrent: string;
    max_cycle_tokens: string; active_from_utc: string; reason: string;
};
const draftFor = (policies: AiPolicy[], plan: PlanCode, scope: FeatureScope): PolicyDraft => {
    const current = activePolicy(policies, plan, scope);
    const upcoming = policies.filter(item => item.enabled && item.plan_code === plan && item.feature_scope === scope && utcMillis(item.active_from_utc) > Date.now())
        .sort((a, b) => utcMillis(a.active_from_utc) - utcMillis(b.active_from_utc))[0];
    return {
        max_daily: current ? String(current.max_daily) : '',
        max_cycle: current ? String(current.max_cycle) : '',
        max_per_conversation: current ? String(current.max_per_conversation) : '',
        max_concurrent: current ? String(current.max_concurrent) : '',
        max_cycle_tokens: current && scope === 'feature:pmp' ? String(current.max_cycle_tokens ?? 0) : '',
        active_from_utc: dateLocal(), reason: '',
    };
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return <label className="pm-admin-field"><span>{label}</span>{children}{hint && <small className="pm-admin-hint">{hint}</small>}</label>;
}

export function AiFeatureSelect({ value, onChange, label = 'AI feature' }: {
    value: FeatureScope; onChange: (value: FeatureScope) => void; label?: string;
}) {
    return <Select value={value} onValueChange={next => onChange(next as FeatureScope)}>
        <SelectTrigger aria-label={label} className="pm-ai-admin-choice-trigger"><SelectValue /></SelectTrigger>
        <SelectContent position="popper" align="start" className="pm-ai-admin-choice-menu">
            <SelectItem value="feature:pmp">PMP question tutor</SelectItem>
            <SelectItem value="feature:ask_ai">Ask AI (general assistant)</SelectItem>
        </SelectContent>
    </Select>;
}

export function AiPlanPolicyEditor({ plan, policies, limits, busy, onSave }: {
    plan: PlanCode; policies: AiPolicy[]; limits: AiHardLimits; busy: boolean;
    onSave: (plan: PlanCode, payload: Record<string, unknown>) => Promise<void>;
}) {
    const [scope, setScope] = useState<FeatureScope>('feature:pmp');
    const [draft, setDraft] = useState<PolicyDraft>(() => draftFor(policies, plan, 'feature:pmp'));
    const current = activePolicy(policies, plan, scope);
    const upcoming = policies.filter(item => item.enabled && item.plan_code === plan && item.feature_scope === scope && utcMillis(item.active_from_utc) > Date.now())
        .sort((a, b) => utcMillis(a.active_from_utc) - utcMillis(b.active_from_utc))[0];
    useEffect(() => setDraft(draftFor(policies, plan, scope)), [policies, plan, scope]);
    const fields: { key: 'max_daily' | 'max_cycle' | 'max_per_conversation' | 'max_concurrent'; label: string; max: number; hint: string }[] = [
        { key: 'max_daily', label: 'Replies / day', max: limits.daily, hint: 'Maximum completed or pending replies per day' },
        { key: 'max_cycle', label: 'Replies / billing cycle', max: limits.cycle, hint: 'Maximum AI replies in the current subscription cycle' },
        { key: 'max_per_conversation', label: 'Replies / conversation', max: limits.conversation, hint: 'Maximum follow-ups in one question conversation' },
        { key: 'max_concurrent', label: 'Concurrent requests', max: limits.concurrent, hint: 'How many replies can be generated at once' },
    ];
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSave(plan, {
            plan_code: plan, feature_scope: scope,
            max_daily: Number(draft.max_daily), max_cycle: Number(draft.max_cycle),
            max_per_conversation: Number(draft.max_per_conversation), max_concurrent: Number(draft.max_concurrent),
            ...(scope === 'feature:pmp' ? { max_cycle_tokens: Number(draft.max_cycle_tokens) } : {}),
            active_from_utc: utcFromLocal(draft.active_from_utc), reason: draft.reason.trim(),
        });
    }
    return <article className="pm-ai-admin-plan-card" data-plan={plan}>
        <div className="pm-ai-admin-plan-header"><div><strong className="pm-ai-admin-plan-name">{plan.toUpperCase()} plan</strong><p>{plan === 'free' ? 'Free members, where separately entitled.' : `Independent ${plan.toUpperCase()} member limits.`}</p></div>
            <span className="pm-ai-admin-plan-status">{current ? `Version ${current.version} active` : upcoming ? 'Scheduled' : 'Not configured'}</span>
        </div>
        <form className="pm-ai-admin-form" onSubmit={event => void submit(event)}>
            <Field label="AI feature"><AiFeatureSelect value={scope} onChange={setScope}/></Field>
            <div className="pm-ai-admin-policy-current" aria-live="polite">
                {current ? <><span>Currently allocated to {plan.toUpperCase()}</span><strong>{scope === 'feature:pmp' ? `${fmt(current.max_cycle_tokens)} provider tokens / cycle` : 'Reply-count limits only'}</strong>
                    <small>{fmt(current.max_daily)} daily replies · {fmt(current.max_cycle)} cycle replies · {fmt(current.max_per_conversation)} per conversation</small></>
                    : <span>No active {scope === 'feature:pmp' ? 'PMP tutor' : 'Ask AI'} limit is configured for {plan.toUpperCase()}.</span>}
                {upcoming && <small>Next scheduled allocation: {scope === 'feature:pmp' ? `${fmt(upcoming.max_cycle_tokens)} tokens` : `${fmt(upcoming.max_cycle)} replies/cycle`} from {new Date(utcMillis(upcoming.active_from_utc)).toLocaleString()}.</small>}
            </div>
            <div className="pm-admin-field-grid pm-ai-admin-plan-fields">
                {fields.map(item => <Field key={item.key} label={item.label} hint={item.hint}>
                    <input type="number" required min="0" max={item.max} step="1" value={draft[item.key]} onChange={e => setDraft(old => ({ ...old, [item.key]: e.target.value }))}/>
                </Field>)}
                {scope === 'feature:pmp' && <Field label="Tokens / billing cycle" hint="Combined provider input + output tokens (reasoning included). This is NOT an OpenAI spending limit.">
                    <input type="number" required min="0" max={limits.pmp_tokens} step="1" value={draft.max_cycle_tokens} onChange={e => setDraft(old => ({ ...old, max_cycle_tokens: e.target.value }))}/>
                </Field>}
                <Field label="Effective from (local time)" hint="Scheduled policies do not take effect until this time.">
                    <input type="datetime-local" required value={draft.active_from_utc} onChange={e => setDraft(old => ({ ...old, active_from_utc: e.target.value }))}/>
                </Field>
            </div>
            <Field label="Reason (audit log)" hint="Required for traceability. There is no minimum character count.">
                <textarea required maxLength={500} value={draft.reason} onChange={e => setDraft(old => ({ ...old, reason: e.target.value }))} placeholder="Reason for this change"/>
            </Field>
            <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy}>
                <Plus size={17}/>{busy ? 'Publishing…' : `Publish ${plan.toUpperCase()} limits`}
            </button>
        </form>
    </article>;
}

export function AiMonthlyCreditEditor({ plan, record, upcoming, busy, onSave }: {
    plan: 'plus' | 'pro'; record?: AiAllowance; upcoming?: AiAllowance; busy: boolean;
    onSave: (plan: 'plus' | 'pro', payload: Record<string, unknown>) => Promise<void>;
}) {
    const [credits, setCredits] = useState(() => record ? String(record.monthly_credits) : '');
    const [effective, setEffective] = useState(dateLocal);
    const [reason, setReason] = useState('');
    useEffect(() => setCredits(record ? String(record.monthly_credits) : ''), [record]);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSave(plan, { plan_code: plan, monthly_credits: Number(credits), active_from_utc: utcFromLocal(effective), reason: reason.trim() });
    }
    return <form className="pm-ai-admin-credit-card pm-ai-admin-form" onSubmit={event => void submit(event)}>
        <div><strong>{plan.toUpperCase()} monthly member credits</strong><p className="pm-admin-hint">Current: {record ? `${fmt(record.monthly_credits)} credits` : 'Not configured'}. Separate from provider tokens.</p>{upcoming && <p className="pm-admin-hint">Next: {fmt(upcoming.monthly_credits)} credits from {new Date(utcMillis(upcoming.active_from_utc)).toLocaleString()}.</p>}</div>
        <Field label="Credits / month"><input type="number" required min="0" max="100000" step="1" value={credits} onChange={e => setCredits(e.target.value)}/></Field>
        <Field label="Effective from (local time)"><input type="datetime-local" required value={effective} onChange={e => setEffective(e.target.value)}/></Field>
        <Field label="Reason (audit log)"><textarea required maxLength={500} value={reason} onChange={e => setReason(e.target.value)}/></Field>
        <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy}>{busy ? 'Publishing…' : `Publish ${plan.toUpperCase()} credits`}</button>
    </form>;
}
