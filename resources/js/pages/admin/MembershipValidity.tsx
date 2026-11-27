import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Pencil, Plus, Save, Search } from 'lucide-react';
import { useState } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { PMDropdown } from '@/components/pm/PMDropdown';
import { formatAmount } from '@/components/onboarding/SignupPlanCard';

type Duration = { code: 'plus' | 'pro'; months: number; amount_minor: number; currency: string; active: boolean };
type SignupPlan = { code: 'free' | 'plus' | 'pro'; name: string; benefits: string[] | null; active: boolean; signup_visible: boolean; signup_badge: string | null };
type Member = { id: number; name: string; email: string; plan_code: 'plus' | 'pro'; months: number | null; starts_at: string | null; ends_at: string | null };
type MemberMatch = Pick<Member, 'id' | 'name' | 'email' | 'plan_code' | 'ends_at'>;
type PaidPlan = Duration['code'];
const durationLabel = (months: number) => `${months} ${months === 1 ? 'month' : 'months'}`;
const url = '/admin/membership-validity';
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(value.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z'))) : 'Not recorded';

function MemberTerm({ member, busy }: { member: Member; busy: boolean }) {
    const form = useForm({ months: member.months ?? 1, restart: !member.starts_at });
    return <form onSubmit={event => { event.preventDefault(); if (!busy) form.put(`${url}/members/${member.id}`, { preserveScroll: true }); }} className="pm-admin-field-grid pm-validity-edit-form">
        <div className="pm-course-admin-wide pm-validity-member-summary">
            <div><strong>{member.name}</strong><small>{member.email}</small></div>
            <span className="pm-course-admin-status">{member.plan_code.toUpperCase()} · Complimentary</span>
            <dl className="pm-validity-term-details"><div><dt>Activated</dt><dd>{dateLabel(member.starts_at)}</dd></div><div><dt>Expires</dt><dd>{dateLabel(member.ends_at)}</dd></div><div><dt>Validity</dt><dd>{member.months ? durationLabel(member.months) : 'Not recorded'}</dd></div></dl>
            <small>Dates shown in Bangladesh time.</small>
        </div>
        <label className="pm-admin-field"><span>Validity (months)</span><input type="number" min={1} max={60} required value={form.data.months || ''} onChange={event => form.setData('months', Number(event.target.value))}/>{form.errors.months && <small className="pm-admin-error" role="alert">{form.errors.months}</small>}</label>
        <div className="pm-admin-field"><label htmlFor="member-term-start">Activation date</label><PMDropdown id="member-term-start" required value={form.data.restart ? 'restart' : 'keep'} placeholder="Choose activation" options={[{value:'keep', label:'Keep original activation', disabled: !member.starts_at}, {value:'restart', label:'Start a new term today'}]} onValueChange={value => form.setData('restart', value === 'restart')}/><small className="pm-admin-hint">{form.data.restart ? 'The full validity period starts from today.' : 'Expiry is recalculated from the original activation date.'}</small>{form.errors.restart && <small className="pm-admin-error" role="alert">{form.errors.restart}</small>}</div>
        <div className="pm-course-admin-wide"><button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={busy || form.processing || !form.isDirty && Boolean(member.starts_at)}><Save size={16}/>{form.processing ? 'Saving…' : 'Update member validity'}</button></div>
    </form>;
}

function SignupPlanEditor({ plan }: { plan: SignupPlan }) {
    const form = useForm({ name: plan.name, benefits: plan.benefits ?? [], signup_badge: plan.signup_badge ?? '', signup_visible: plan.code === 'free' || plan.signup_visible });
    return <form className="pm-admin-field-grid" onSubmit={event => { event.preventDefault(); form.put(`${url}/signup-plans/${plan.code}`, { preserveScroll: true }); }}>
        <label className="pm-admin-field"><span>Display name</span><input required maxLength={40} value={form.data.name} onChange={event => form.setData('name', event.target.value)}/>{form.errors.name && <small className="pm-admin-error">{form.errors.name}</small>}</label>
        <label className="pm-admin-field"><span>Card badge (optional)</span><input maxLength={40} value={form.data.signup_badge} onChange={event => form.setData('signup_badge', event.target.value)}/>{form.errors.signup_badge && <small className="pm-admin-error">{form.errors.signup_badge}</small>}</label>
        <label className="pm-admin-field pm-course-admin-wide"><span>Benefits (one per line, up to 12)</span><textarea rows={5} value={form.data.benefits.join('\n')} onChange={event => form.setData('benefits', event.target.value.split('\n'))}/>{Object.entries(form.errors).filter(([key]) => key === 'benefits' || key.startsWith('benefits.')).map(([key, error]) => <small key={key} className="pm-admin-error">{error}</small>)}</label>
        <label className="pm-course-admin-publish"><input type="checkbox" checked={form.data.signup_visible} disabled={plan.code === 'free'} onChange={event => form.setData('signup_visible', event.target.checked)}/> Show on Choose Plan signup screen</label>
        {form.errors.signup_visible && <small className="pm-admin-error">{form.errors.signup_visible}</small>}
        {!plan.active && <p className="pm-course-admin-wide" role="status">This plan is globally inactive and will not appear until active.</p>}
        <div className="pm-course-admin-wide"><button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={form.processing}><Save size={16}/>{form.processing ? 'Saving…' : 'Save signup plan'}</button></div>
    </form>;
}

export default function MembershipValidity({ prices, signupPlans, member, memberId, memberMatches, search, complimentaryEnabled }: { prices: Duration[]; signupPlans: SignupPlan[]; member: Member | null; memberId: number | null; memberMatches: MemberMatch[]; search: string; complimentaryEnabled: boolean }) {
    const { flash, errors } = usePage<{ flash?: {status?: string}; errors: Record<string, string> }>().props;
    const [lookup, setLookup] = useState(search);
    const [looking, setLooking] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>(signupPlans[0]?.code ?? 'free');
    const selected = signupPlans.find(plan => plan.code === selectedPlan);
    const [durationPlan, setDurationPlan] = useState<PaidPlan>('plus');
    const [editor, setEditor] = useState<'add' | 'edit' | null>(null);
    const [priceInput, setPriceInput] = useState('');
    const rows = prices.filter(row => row.code === durationPlan);
    const form = useForm<{plan: PaidPlan; months: number; amount_minor: number; active: boolean}>({ plan: 'plus', months: 1, amount_minor: 0, active: true });
    const openEditor = (row?: Duration) => {
        form.clearErrors();
        setPriceInput(row ? (row.amount_minor / 100).toFixed(2) : '');
        form.setData(row ? { plan: row.code, months: row.months, amount_minor: row.amount_minor, active: Boolean(row.active) } : { plan: durationPlan, months: 0, amount_minor: 0, active: true });
        setEditor(row ? 'edit' : 'add');
    };
    const alreadyExists = editor === 'add' && rows.some(row => row.months === form.data.months);
    const visitMember = (id?: number) => {
        router.get(url, id ? { q: search, member_id: id } : { q: lookup.trim() }, {
            only: id ? ['member', 'memberId', 'errors'] : ['member', 'memberId', 'memberMatches', 'search', 'errors'],
            preserveScroll: true, preserveState: true, replace: true,
            onStart: () => setLooking(true), onFinish: () => setLooking(false),
        });
    };
    return <AdminLayout active={url} title="Signup plans & validity" subtitle="Manage Choose Plan cards, available durations and existing complimentary Plus and Pro terms.">
        <Head title="Signup plans & validity | PM Circle Admin"/>
        {flash?.status && <p className="pm-admin-notice pm-admin-notice-success" role="status">{flash.status}</p>}
        <div className="pm-course-admin-editor pm-validity-admin">
            <section className="pm-admin-panel pm-course-admin-section">
                <h2>Choose Plan screen</h2><p>Edit the signup plan cards. Names and benefits use the shared membership catalog; badges and visibility apply only to signup. Free remains available as the fallback.</p>
                <div className="pm-admin-field"><label htmlFor="signup-plan-editor">Plan card</label><PMDropdown id="signup-plan-editor" value={selectedPlan} required placeholder="Choose plan card" options={signupPlans.map(plan => ({value: plan.code, label: `${plan.name} (${plan.code.toUpperCase()})`}))} onValueChange={setSelectedPlan}/></div>
                {selected && <SignupPlanEditor key={selected.code} plan={selected}/>}
                {!complimentaryEnabled && <p role="status">Plus and Pro are not available at signup while complimentary access is disabled and signup checkout is unavailable.</p>}
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-heading"><div><h2>Signup durations</h2><p>Manage available terms and prices for new signups. Existing membership terms are unchanged.</p></div><button type="button" className="pm-admin-button pm-admin-button-primary" disabled={form.processing || editor !== null} onClick={() => openEditor()}><Plus size={16}/> Add duration</button></div>
                <div className="pm-validity-toolbar"><div className="pm-admin-field"><label htmlFor="duration-plan-filter">Membership plan</label><PMDropdown id="duration-plan-filter" required value={durationPlan} placeholder="Choose plan" options={[{value:'plus', label:'Plus'}, {value:'pro', label:'Pro'}]} disabled={editor !== null || form.processing} onValueChange={value => setDurationPlan(value as PaidPlan)}/></div><small className="pm-admin-hint">{rows.length} duration{rows.length === 1 ? '' : 's'} · {rows.filter(row => row.active).length} available</small></div>
                {editor && <form className="pm-admin-field-grid pm-validity-edit-form" onSubmit={event => { event.preventDefault(); if (!alreadyExists) form.put(`${url}/durations`, { preserveScroll: true, onSuccess: () => setEditor(null) }); }}>
                    <div className="pm-course-admin-wide pm-course-admin-heading"><div><h3>{editor === 'edit' ? `Edit ${durationLabel(form.data.months)}` : 'Add duration'} · {durationPlan.toUpperCase()}</h3><p>{editor === 'edit' ? 'Update the price or availability of this duration.' : 'Choose a new duration for this plan.'}</p></div></div>
                    <label className="pm-admin-field"><span>Duration (months)</span><input type="number" min={1} max={60} required readOnly={editor === 'edit'} value={form.data.months || ''} onChange={event => form.setData('months', Number(event.target.value))}/>{alreadyExists && <small className="pm-admin-error" role="alert">This duration already exists. Cancel and edit its row instead.</small>}{form.errors.months && <small className="pm-admin-error">{form.errors.months}</small>}</label>
                    <label className="pm-admin-field"><span>Total price (BDT)</span><input type="number" min="0.01" max="1000000" step="0.01" required value={priceInput} onChange={event => { setPriceInput(event.target.value); form.setData('amount_minor', Math.round(Number(event.target.value) * 100)); }}/>{form.errors.amount_minor && <small className="pm-admin-error">{form.errors.amount_minor}</small>}</label>
                    <label className="pm-course-admin-publish pm-course-admin-wide"><input type="checkbox" checked={form.data.active} onChange={event => form.setData('active', event.target.checked)}/> Available at signup</label>
                    {form.errors.active && <small className="pm-admin-error">{form.errors.active}</small>}{form.errors.plan && <small className="pm-admin-error">{form.errors.plan}</small>}
                    <div className="pm-course-admin-wide pm-admin-editor-actions"><button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={form.processing || alreadyExists}><Save size={16}/>{form.processing ? 'Saving…' : editor === 'edit' ? 'Save changes' : 'Add duration'}</button><button type="button" className="pm-admin-button" disabled={form.processing} onClick={() => { form.clearErrors(); setEditor(null); }}>Cancel</button></div>
                </form>}
                <div className="pm-course-admin-table-scroll" role="region" aria-label="Membership durations" tabIndex={0}><table className="pm-course-admin-table"><thead><tr><th scope="col">Validity</th><th scope="col">Total price</th><th scope="col">Signup availability</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(row => <tr key={`${row.code}-${row.months}`}><td><strong>{durationLabel(row.months)}</strong></td><td>{formatAmount(row.amount_minor, row.currency)}</td><td><span className={`pm-course-admin-status ${row.active ? 'is-published' : ''}`}>{row.active ? 'Available' : 'Disabled'}</span></td><td><button type="button" className="pm-admin-button" disabled={editor !== null || form.processing} onClick={() => openEditor(row)} aria-label={`Edit ${durationLabel(row.months)}`}><Pencil size={14}/> Edit</button></td></tr>)}{rows.length === 0 && <tr><td colSpan={4}>No durations configured. Select Add duration to create one.</td></tr>}</tbody></table></div>
            </section>
            <section className="pm-admin-panel pm-course-admin-section">
                <div className="pm-course-admin-heading"><div><h2>Existing member validity</h2><p>Find a complimentary Plus or Pro member and adjust their validity. Paid subscriptions are not changed.</p></div></div>
                {!complimentaryEnabled && <p role="status">Complimentary access is disabled. Saved terms will not grant access while it is disabled.</p>}
                <form className="pm-validity-search" onSubmit={event => { event.preventDefault(); if (lookup.trim().length >= 2 && !looking) visitMember(); }}>
                    <label className="pm-admin-field"><span>Member name or email</span><input type="search" minLength={2} maxLength={80} required value={lookup} placeholder="Search by name or email" onChange={event => setLookup(event.target.value)}/>{errors.q && <small className="pm-admin-error" role="alert">{errors.q}</small>}</label><button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={looking || lookup.trim().length < 2}><Search size={16}/>{looking ? 'Loading…' : 'Search members'}</button>
                </form>
                {search && <div aria-live="polite" className="pm-admin-hint">{memberMatches.length === 20 ? 'Showing the first 20 matches. Refine your search for more specific results.' : `${memberMatches.length} matching member${memberMatches.length === 1 ? '' : 's'}.`}</div>}
                {memberMatches.length > 0 && <div className="pm-course-admin-table-scroll" role="region" aria-label="Matching members" tabIndex={0}><table className="pm-course-admin-table"><thead><tr><th scope="col">Member</th><th scope="col">Plan</th><th scope="col">Expires</th><th scope="col">Action</th></tr></thead><tbody>{memberMatches.map(candidate => <tr key={candidate.id}><td><strong>{candidate.name}</strong><small>{candidate.email}</small></td><td><span className="pm-course-admin-status">{candidate.plan_code.toUpperCase()}</span></td><td>{dateLabel(candidate.id === member?.id ? member.ends_at : candidate.ends_at)}</td><td><button type="button" className="pm-admin-button" disabled={looking || candidate.id === member?.id} onClick={() => visitMember(candidate.id)} aria-label={`Manage validity for ${candidate.name}`}>{candidate.id === member?.id ? 'Selected' : 'Manage'}</button></td></tr>)}</tbody></table></div>}
                {search && memberMatches.length === 0 && <p className="pm-admin-hint">No eligible members found. Try another name or email.</p>}
                {member ? <MemberTerm key={`${member.id}-${member.months}-${member.starts_at}-${member.ends_at}`} member={member} busy={looking}/> : memberId ? <p role="status">No Plus or Pro complimentary grant found for this member.</p> : null}
            </section>
        </div>
    </AdminLayout>;
}
