import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { CalendarClock, CheckCircle2, Clock3, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';

type Settings = {
    enabled: boolean | number;
    auto_publish: boolean | number;
    auto_review: boolean | number;
    publish_time: string;
    expiry_hours: number;
    max_reviews_per_user_daily: number;
};
type Readiness = {
    gateway: boolean;
    editorial: boolean;
    separate_key: boolean;
    generation_feature: boolean;
    review_feature: boolean;
    pricing: boolean;
    global_budget: boolean;
    editorial_budget: boolean;
    model: string;
};
type Challenge = {
    id: number;
    title: string;
    daily_slot: string;
    slug: string;
    status: string;
    published_at: string;
    expires_at: string | null;
};
type Draft = { id: number; slot_key: string; status: string; publication_at: string | null; created_at: string };
type Props = { settings: Settings; readiness: Readiness; recent: Challenge[]; drafts: Draft[] };

const utc = (value: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
const dateLabel = (date: string | null) => date ? utc(date).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) + ' (Dhaka)' : '—';
const localDateTime = (value: string | null) => {
    if (!value) return '';
    const date = utc(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function ExpiryEditor({ item }: { item: Challenge }) {
    const [date, setDate] = useState(localDateTime(item.expires_at));
    const [reason, setReason] = useState('Administrator adjusted challenge expiration');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!date) return;
        router.put(`/admin/ai/daily-challenge/${item.id}/expires`, {
            expires_at: new Date(date).toISOString(), reason,
        }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false),
            onError: errors => setError(Object.values(errors).join(' · ')), });
    };
    return <form onSubmit={submit} className="pm-ai-daily-expiry-form">
        <label className="pm-admin-field"><span>Expires (your local time)</span>
            <input aria-label={`Expiry for ${item.title}`} type="datetime-local" required value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className="pm-admin-field"><span>Audit reason</span>
            <input required minLength={8} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <button className="pm-admin-button" type="submit" disabled={busy || !date}>{busy ? 'Saving…' : 'Update expiry'}</button>
        {error && <p className="pm-error" role="alert">{error}</p>}
    </form>;
}

export default function DailyChallenge({ settings, readiness, recent, drafts }: Props) {
    const form = useForm({
        enabled: Boolean(settings.enabled),
        auto_publish: Boolean(settings.auto_publish),
        auto_review: Boolean(settings.auto_review),
        publish_time: settings.publish_time,
        expiry_hours: Number(settings.expiry_hours),
        max_reviews_per_user_daily: Number(settings.max_reviews_per_user_daily),
        reason: 'Administrator updated Daily Challenge AI settings',
    });
    const generation = useForm({ date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) });
    const [saved, setSaved] = useState(false);
    const checks: { label: string; value: boolean }[] = [
        { label: 'Central AI gateway enabled', value: readiness.gateway },
        { label: 'AI editorial scheduler enabled', value: readiness.editorial },
        { label: 'Dedicated Daily Challenge API key configured', value: readiness.separate_key },
        { label: 'GPT-5-nano generation feature and prompt ready', value: readiness.generation_feature },
        { label: 'GPT-5-nano evaluation feature and prompt ready', value: readiness.review_feature },
        { label: 'Model pricing configured', value: readiness.pricing },
        { label: 'Global AI budget configured', value: readiness.global_budget },
        { label: 'Editorial generation budget configured', value: readiness.editorial_budget },
    ];
    return <AdminLayout title="Daily Challenge AI" subtitle="Schedule original scenarios, automatically score member answers and control expiry." active="/admin/ai/daily-challenge">
        <Head title="Daily Challenge AI | PM Circle" />
        <section className="pm-admin-panel pm-ai-daily-section">
            <div className="pm-ai-daily-heading"><div><span className="pm-admin-kicker">CENTRALIZED AI CONTROL</span><h2>Daily Challenge automation</h2>
                <p>Dedicated restricted key, {readiness.model}, separate from PMP. Keys are configured on the server and never displayed here.</p></div>
                <Sparkles size={25} aria-hidden="true" /></div>
            <form className="pm-ai-admin-form" onSubmit={e => { e.preventDefault(); setSaved(false);
                form.put('/admin/ai/daily-challenge', { preserveScroll: true, onSuccess: () => setSaved(true) }); }}>
                <div className="pm-ai-daily-switches">
                    {([
                        ['enabled', 'Enable Daily Challenge AI', 'Master switch; does not affect PMP, resume or other AI features'],
                        ['auto_publish', 'Auto-publish one new challenge each day', 'Publishes validated AI drafts when their scheduled time arrives without manual approval'],
                        ['auto_review', 'Automatically evaluate submitted responses', 'Free feedback scored out of 10 for each qualifying original response; replies remain community-only'],
                    ] as const).map(([key, title, detail]) => <label className="pm-ai-daily-switch" key={key}>
                        <input type="checkbox" checked={form.data[key]} onChange={e => form.setData(key, e.target.checked)} />
                        <span><strong>{title}</strong><small>{detail}</small></span>
                    </label>)}
                </div>
                <div className="pm-admin-field-grid">
                    <label className="pm-admin-field"><span>Daily publication time (Asia/Dhaka)</span>
                        <input type="time" required value={form.data.publish_time} onChange={e => form.setData('publish_time', e.target.value)} />
                        {form.errors.publish_time && <small className="pm-error">{form.errors.publish_time}</small>}
                    </label>
                    <label className="pm-admin-field"><span>Challenge open duration (hours)</span>
                        <input type="number" required min={1} max={168} value={form.data.expiry_hours} onChange={e => form.setData('expiry_hours', Number(e.target.value))} />
                        <small className="pm-admin-hint">1–168 hours. Applies to newly published challenges; existing dates can be changed below.</small>
                    </label>
                    <label className="pm-admin-field"><span>Max automatic reviews per member per day</span>
                        <input type="number" required min={1} max={50} value={form.data.max_reviews_per_user_daily} onChange={e => form.setData('max_reviews_per_user_daily', Number(e.target.value))} />
                        <small className="pm-admin-hint">Limits provider costs and misuse without charging member AI credits.</small>
                    </label>
                    <label className="pm-admin-field"><span>Change reason (audited)</span>
                        <input required minLength={8} maxLength={500} value={form.data.reason} onChange={e => form.setData('reason', e.target.value)} />
                    </label>
                </div>
                {Object.entries(form.errors).length > 0 && <div role="alert" className="pm-error">{Object.entries(form.errors).map(([k, v]) => <p key={k}>{k}: {v}</p>)}</div>}
                {saved && <p className="pm-ai-daily-success" role="status"><CheckCircle2 size={16}/> Settings saved successfully.</p>}
                <button className="pm-admin-button pm-admin-button-primary" type="submit" disabled={form.processing}>
                    {form.processing ? 'Saving…' : 'Save Daily Challenge settings'}</button>
            </form>
        </section>
        <section className="pm-admin-panel pm-ai-daily-section">
            <div className="pm-ai-daily-heading"><div><h2>Integration readiness</h2><p>Required server-side configuration. The secret key itself is never returned to the browser.</p></div><ShieldAlert size={22}/></div>
            <div className="pm-ai-daily-checks">{checks.map(item => <div key={item.label} className="pm-ai-daily-check">
                {item.value ? <CheckCircle2 size={17} aria-label="Ready"/> : <ShieldAlert size={17} aria-label="Needs setup"/>}
                <span>{item.label}</span><strong>{item.value ? 'Ready' : 'Needs setup'}</strong></div>)}</div>
        </section>
        <section className="pm-admin-panel pm-ai-daily-section">
            <div className="pm-ai-daily-heading"><div><h2>Generate a challenge draft</h2><p>Queue a specific date. When automatic publication is disabled, the existing editorial approval process still applies.</p></div><CalendarClock size={22}/></div>
            <form className="pm-ai-daily-generate" onSubmit={e => { e.preventDefault(); generation.post('/admin/ai/daily-challenge/generate', { preserveScroll: true }); }}>
                <label className="pm-admin-field"><span>Publication date (Dhaka)</span><input type="date" required value={generation.data.date} onChange={e => generation.setData('date', e.target.value)}/></label>
                <button className="pm-admin-button pm-admin-button-primary" disabled={generation.processing} type="submit">{generation.processing ? 'Queueing…' : 'Queue generation'}</button>
                {generation.errors.date && <p className="pm-error" role="alert">{generation.errors.date}</p>}
            </form>
            <div className="pm-ai-daily-table-wrap"><table><thead><tr><th>Slot</th><th>Status</th><th>Scheduled (Dhaka)</th></tr></thead>
                <tbody>{drafts.map(draft => <tr key={draft.id}><td>{draft.slot_key}</td><td>{draft.status}</td><td>{dateLabel(draft.publication_at)}</td></tr>)}
                {drafts.length === 0 && <tr><td colSpan={3}>No AI drafts yet. Daily preparation starts when the scheduler and automation are enabled.</td></tr>}</tbody></table></div>
        </section>
        <section className="pm-admin-panel pm-ai-daily-section">
            <div className="pm-ai-daily-heading"><div><h2>Published challenges and expiry</h2><p>Change the exact expiry of an individual challenge. Past or reached expiry closes discussions without removing responses or assessments.</p></div><Clock3 size={22}/></div>
            {recent.length === 0 ? <p className="pm-admin-hint">No AI-published daily challenges yet.</p> :
                <div className="pm-ai-daily-challenges">{recent.map(item => <article key={item.id} className="pm-ai-daily-challenge-row">
                    <div className="pm-ai-daily-challenge-meta"><div><strong>{item.daily_slot} · {item.title}</strong><small>{item.status} · Published: {dateLabel(item.published_at)} · Expires: {dateLabel(item.expires_at)}</small></div>
                        <Link href={`/scenarios/${encodeURIComponent(item.slug)}`} target="_blank">View challenge</Link></div>
                    <ExpiryEditor item={item} />
                </article>)}</div>}
            <button className="pm-admin-button" type="button" onClick={() => router.reload({ only: ['settings', 'readiness', 'recent', 'drafts'] })}><RefreshCw size={15}/> Refresh status</button>
        </section>
    </AdminLayout>;
}
