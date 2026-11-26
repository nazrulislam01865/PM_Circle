import { Head, Link, router, useForm } from '@inertiajs/react';
import { useRef, useState, type FormEvent } from 'react';
import { Clock3, RefreshCw, ExternalLink, Layers, SlidersHorizontal, Info, CalendarDays, X, Sparkles, AlertCircle } from 'lucide-react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { AdminMultiChoice } from '@/components/admin/AdminMultiChoice';
import { Actions, Panel, CheckField, Field, FixedChoice, Preview, PreviewRow, Notices, ConnectionPanel, choices, type Connection } from '@/components/admin/ai/SettingsShared';

type Settings = {
    enabled: boolean | number;
    auto_publish: boolean | number;
    auto_review: boolean | number;
    publish_time: string;
    expiry_hours: number;
    max_reviews_per_user_daily: number;
    generation_title_hint: string | null;
    generation_domains: string[];
    generation_topics: string[];
    generation_difficulty: string | null;
    generation_approach: string | null;
    generation_notes: string | null;
};
type Readiness = {
    gateway: boolean;
    editorial: boolean;
    separate_key: boolean;
    moderation_key: boolean;
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
type Draft = { id: number; slot_key: string; status: string; publication_at: string | null; created_at: string; generation_attempts: number; archive_recovery: boolean | number; has_payload: boolean | number; request_status: string | null; error_code: string | null };
type Choice = { value: string; label: string };
type GenerationOptions = {
    daily_challenge_domain: Choice[];
    daily_challenge_topic: Choice[];
    daily_challenge_difficulty: Choice[];
    daily_challenge_approach: Choice[];
};
type Props = { today: string; generationNotice: string | null; connection: Connection; settings: Settings; readiness: Readiness; recent: Challenge[]; drafts: Draft[]; generationOptions: GenerationOptions; retryableErrors: string[] };

const utc = (value: string) => new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
const dateLabel = (date: string | null) => date ? utc(date).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) + ' (Dhaka)' : '—';
const slotDate = (draft: Draft) => draft.slot_key.replace(/^daily-scenario:/, '');
const readyStatuses = ['scheduled', 'pending_review', 'approved'];
const draftStatus = (draft: Draft, archived: boolean, enabled: boolean) => {
    if (draft.request_status === 'provider_status_unknown') return { label: 'Reconciliation required', tone: 'error' };
    if (draft.status === 'failed') return { label: 'Failed', tone: 'error' };
    if (draft.status === 'published') return { label: 'Published', tone: 'success' };
    if (draft.status === 'queued') return { label: draft.request_status === 'running' ? 'Generating' : 'Queued', tone: 'info' };
    if (readyStatuses.includes(draft.status) && !draft.has_payload) return { label: 'Content missing', tone: 'error' };
    if (readyStatuses.includes(draft.status)) return { label: !enabled ? 'Automation paused' : archived ? 'Ready for archive' : draft.publication_at && utc(draft.publication_at).getTime() <= Date.now() ? 'Ready to publish' : 'Scheduled (automatic)', tone: 'info' };
    return { label: draft.status.replaceAll('_', ' '), tone: 'neutral' };
};
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

export default function DailyChallenge({ settings, readiness, recent, drafts, generationOptions, connection, today, generationNotice, retryableErrors }: Props) {
    const form = useForm({
        enabled: Boolean(settings.enabled),
        auto_publish: Boolean(settings.enabled),
        auto_review: Boolean(settings.auto_review),
        publish_time: settings.publish_time,
        expiry_hours: Number(settings.expiry_hours),
        max_reviews_per_user_daily: Number(settings.max_reviews_per_user_daily),
        generation_title_hint: settings.generation_title_hint ?? '',
        generation_domains: settings.generation_domains ?? [],
        generation_topics: settings.generation_topics ?? [],
        generation_difficulty: settings.generation_difficulty ?? '',
        generation_approach: settings.generation_approach ?? '',
        generation_notes: settings.generation_notes ?? '',
        reason: 'Administrator updated Daily Challenge AI settings',
    });
    const generation = useForm({
        date: today,
        exact_title: '',
    });
    const [saved, setSaved] = useState(false);
    const [rowBusy, setRowBusy] = useState<string | null>(null);
    const [rowError, setRowError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const draftDialog = useRef<HTMLDialogElement>(null);
    const next = new Date();
    const dhaka = next.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
    let publish = new Date(`${dhaka}T${form.data.publish_time}:00+06:00`);
    if (publish <= next) publish = new Date(publish.getTime() + 86400000);
    const expiry = new Date(publish.getTime() + form.data.expiry_hours * 3600000);
    const times = choices(Array.from({length:96}, (_,i) => `${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`), v => new Date(`2000-01-01T${v}:00Z`).toLocaleTimeString('en-US',{timeZone:'UTC',hour:'2-digit',minute:'2-digit'}));
    if (!times.some(t => t.value === form.data.publish_time)) times.push({value:form.data.publish_time,label:form.data.publish_time});
    const err = (key: string) => Object.entries(form.errors).find(([name]) => name === key || name.startsWith(`${key}.`))?.[1];
    const archived = (draft: Draft) => slotDate(draft) < today || Boolean(draft.publication_at && utc(draft.publication_at).getTime() + Number(settings.expiry_hours) * 3600000 <= Date.now());
    const activeDrafts = drafts.filter(draft => !archived(draft));
    const pastDrafts = drafts.filter(archived);
    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const availableDates = [today, tomorrow.toISOString().slice(0, 10)].filter(date => new Date(`${date}T${settings.publish_time.slice(0, 5)}:00+06:00`).getTime() + Number(settings.expiry_hours) * 3600000 > Date.now()).filter(date => !drafts.some(draft => slotDate(draft) === date) && !recent.some(item => item.daily_slot === date));
    const canPublish = Boolean(settings.enabled) && Boolean(settings.auto_publish) && readiness.gateway && readiness.editorial;
    const canGenerate = canPublish && readiness.separate_key && readiness.moderation_key && readiness.generation_feature && readiness.pricing && readiness.global_budget && readiness.editorial_budget;
    const actionBusy = form.isDirty || rowBusy !== null || generation.processing;
    const actionsDisabled = !canGenerate || actionBusy;
    const publicationDisabled = !canPublish || actionBusy;
    const perform = (key: string, path: string, data: Record<string, string | boolean>) => {
        if (path.endsWith('/publish') ? publicationDisabled : actionsDisabled) return;
        setRowError('');
        router.post(path, data, { preserveScroll: true, onStart: () => setRowBusy(key), onFinish: () => setRowBusy(null), onError: errors => setRowError(Object.values(errors).join(' · ')) });
    };
    const retry = (draft: Draft) => perform(draft.slot_key, '/admin/ai/daily-challenge/generate', { date: slotDate(draft), archive_recovery: archived(draft) });
    const refresh = () => router.reload({ only: ['readiness', 'recent', 'drafts', 'connection', 'today', 'generationNotice'], onStart: () => setRefreshing(true), onFinish: () => setRefreshing(false) });
    const renderDraft = (draft: Draft) => {
        const isArchive = archived(draft);
        const state = draftStatus(draft, isArchive, canPublish);
        const busy = rowBusy === draft.slot_key;
        const safeRetry = draft.status === 'failed' && draft.request_status === 'failed' && retryableErrors.includes(draft.error_code ?? '') && draft.generation_attempts < 6;
        const due = Boolean(draft.has_payload) && readyStatuses.includes(draft.status) && (!draft.request_status || draft.request_status === 'completed') && Boolean(draft.publication_at && utc(draft.publication_at).getTime() <= Date.now());
        const item = recent.find(challenge => challenge.daily_slot === slotDate(draft));
        return <tr key={draft.id}>
            <td><strong>{slotDate(draft)}</strong>{draft.generation_attempts > 0 && <small>{draft.generation_attempts} {draft.generation_attempts === 1 ? 'attempt' : 'attempts'}</small>}</td>
            <td><span className={`pm-daily-state is-${state.tone}`}>{state.label}</span>{Boolean(draft.archive_recovery) && draft.status !== 'published' && <small>Archive recovery</small>}</td>
            <td>{dateLabel(draft.publication_at)}</td>
            <td>{draft.error_code ? <span className="pm-daily-error-code">{draft.error_code.replaceAll('_', ' ').toLowerCase()}</span> : '—'}</td>
            <td><div className="pm-daily-row-actions">
                {item ? <Link className="pm-admin-button" href={`/scenarios/${encodeURIComponent(item.slug)}`}>View challenge</Link>
                    : safeRetry ? <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={actionsDisabled} onClick={() => retry(draft)}><RefreshCw size={15}/>{busy ? 'Queueing…' : isArchive ? 'Retry to archive' : 'Retry generation'}</button>
                    : due ? <button type="button" className="pm-admin-button pm-admin-button-primary" disabled={publicationDisabled} onClick={() => perform(draft.slot_key, `/admin/ai/daily-challenge/drafts/${draft.id}/publish`, {})}>{busy ? 'Publishing…' : isArchive ? 'Publish to archive' : 'Publish now'}</button>
                    : draft.status === 'failed' || draft.request_status === 'provider_status_unknown' ? <small>{draft.generation_attempts >= 6 ? 'Retry limit reached' : 'Check AI request history'}</small> : <span>—</span>}
            </div></td>
        </tr>;
    };
    const tableHead = <thead><tr><th>Date</th><th>Status</th><th>Scheduled (Dhaka)</th><th>Last error</th><th>Action</th></tr></thead>;
    const checks: { label: string; value: boolean }[] = [
        { label: 'Central AI gateway enabled', value: readiness.gateway },
        { label: 'AI editorial scheduler enabled', value: readiness.editorial },
        { label: 'Daily Challenge generation credential configured', value: readiness.separate_key },
        { label: 'Post Check moderation credential configured', value: readiness.moderation_key },
        { label: 'GPT-5-nano generation feature and prompt ready', value: readiness.generation_feature },
        { label: 'GPT-5-nano evaluation feature and prompt ready', value: readiness.review_feature },
        { label: 'Model pricing configured', value: readiness.pricing },
        { label: 'Global AI budget configured', value: readiness.global_budget },
        { label: 'Editorial generation budget configured', value: readiness.editorial_budget },
    ];
    return <AdminLayout title="Daily Challenge AI" subtitle="Configure daily scenario generation, publication and answer evaluation." active="/admin/ai/daily-challenge" headingAction={<Actions form="daily-ai-settings" processing={form.processing}><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => draftDialog.current?.showModal()}>Generate Daily Challenge</button></Actions>}>
        <Head title="Daily Challenge AI | PM Circle" />
        <div className="pm-career-settings pm-feature-settings pm-daily-settings">
        <form id="daily-ai-settings" onSubmit={e => { e.preventDefault(); setSaved(false); form.put('/admin/ai/daily-challenge', {preserveScroll:true,onSuccess:()=>setSaved(true)}); }}>
        <Notices saved={saved} errors={form.errors}/>
        <div className="pm-career-settings-grid">
        <div className="pm-career-settings-column">
            <Panel title="Automatic generation & publication">
                <CheckField checked={form.data.enabled} onChange={v => { form.setData(data => ({...data, enabled:v, auto_publish:v, auto_review:v && data.auto_review})); }}><strong>Enable Daily Challenge AI</strong><small>Automatically generate and publish one scenario challenge per day.</small></CheckField>
                <AdminChoice id="daily-time" label="Publication time" value={form.data.publish_time} options={times} onChange={v=>form.setData('publish_time',v)} error={err('publish_time')}/>
                <FixedChoice id="daily-timezone" label="Time zone" value="Asia/Dhaka"/>
                <AdminChoice id="daily-expiry" label="Challenge open duration" value={String(form.data.expiry_hours)} options={choices(Array.from({length:168},(_,i)=>i+1),v=>`${v} hours`)} onChange={v=>form.setData('expiry_hours',Number(v))} error={err('expiry_hours')}/>
                <FixedChoice id="daily-publication" label="Publishing mode" value="Automatic publication"/>
                {Boolean(settings.enabled) && !Boolean(settings.auto_publish) && <p className="pm-admin-hint">Save settings to activate automatic publication.</p>}
            </Panel>
            <Panel title="Scenario generation guidance" action={<Link href="/admin/master-data?category=daily_challenge_domain">Manage choices <ExternalLink size={15}/></Link>}>
                <Field id="daily-title" label="Scenario title guidance" error={err('generation_title_hint')}><input id="daily-title" placeholder="e.g. Real-world project management scenarios" maxLength={180} value={form.data.generation_title_hint} onChange={e=>form.setData('generation_title_hint',e.target.value)}/></Field>
                <AdminMultiChoice inlineList id="daily-domains" label="Domains" options={generationOptions.daily_challenge_domain} value={form.data.generation_domains} maxSelections={5} onChange={v=>form.setData('generation_domains',v)} error={err('generation_domains')}/>
                <AdminMultiChoice inlineList searchable id="daily-topics" label="Topics" options={generationOptions.daily_challenge_topic} value={form.data.generation_topics} maxSelections={8} onChange={v=>form.setData('generation_topics',v)} error={err('generation_topics')}/>
                <AdminChoice id="daily-difficulty" label="Difficulty" value={form.data.generation_difficulty} options={generationOptions.daily_challenge_difficulty} onChange={v=>form.setData('generation_difficulty',v)} clearable placeholder="Let AI choose" error={err('generation_difficulty')}/>
                <AdminChoice id="daily-approach" label="Delivery approach" value={form.data.generation_approach} options={generationOptions.daily_challenge_approach} onChange={v=>form.setData('generation_approach',v)} clearable placeholder="Let AI choose" error={err('generation_approach')}/>
                <Field id="daily-guidance" label="Additional guidance" error={err('generation_notes')}><textarea id="daily-guidance" rows={5} maxLength={500} placeholder="Add any specific instructions, context or focus areas for scenario generation (optional)." value={form.data.generation_notes} onChange={e=>form.setData('generation_notes',e.target.value)}/></Field><details><summary>Audit reason</summary><Field id="daily-reason" label="Change reason" error={err('reason')}><input id="daily-reason" required minLength={8} maxLength={500} value={form.data.reason} onChange={e=>form.setData('reason',e.target.value)}/></Field></details>
            </Panel>
        </div>
        <div className="pm-career-settings-column">
            <ConnectionPanel feature="daily-challenge" connection={connection} detail="AI Workspace routing"/>
            <Panel title="Answer evaluation"><CheckField checked={form.data.auto_review} onChange={form.data.enabled?v=>form.setData('auto_review',v):undefined}><strong>Automatically evaluate submitted responses</strong><small>Use AI to review responses and provide a score with feedback.</small></CheckField>
                <AdminChoice id="daily-review-limit" label="Max automatic reviews per member per day" value={String(form.data.max_reviews_per_user_daily)} options={choices(Array.from({length:50},(_,i)=>i+1))} onChange={v=>form.setData('max_reviews_per_user_daily',Number(v))} error={err('max_reviews_per_user_daily')}/>
                <FixedChoice id="daily-score" label="Score" value="Out of 10"/>
                <p className="pm-feature-info"><Info size={16}/> Replies remain community-only and are not published publicly.</p>
            </Panel>
            <Panel title="Publishing preview"><Preview><PreviewRow icon={<CalendarDays/>} label="Next publication" value={form.data.enabled?dateLabel(Number.isNaN(publish.getTime())?null:publish.toISOString()):'Disabled'}/><PreviewRow icon={<CalendarDays/>} label="Expiry (challenge closes)" value={form.data.enabled?dateLabel(Number.isNaN(expiry.getTime())?null:expiry.toISOString()):'—'}/><PreviewRow icon={<Clock3/>} label="Bangladesh time"/></Preview></Panel>
            <Panel title="Integration readiness"><Preview><PreviewRow icon={<Layers/>} label="AI gateway" value={<span className={readiness.gateway?'pm-feature-ready':''}>{readiness.gateway?'Ready':'Not configured'}</span>}/><PreviewRow icon={<CalendarDays/>} label="Editorial scheduler" value={readiness.editorial?'Configured':'Not configured'}/><PreviewRow icon={<SlidersHorizontal/>} label="Feature prompts and budgets" value={checks.every(c=>c.value)?'Configured':'Not configured'}/></Preview><details><summary>Readiness details</summary>{checks.map(c=><p key={c.label}>{c.label}: {c.value?'Ready':'Not configured'}</p>)}</details></Panel>
        </div>
        </div>
        </form>
        <dialog ref={draftDialog} className="pm-career-settings-dialog"><div className="pm-career-settings-dialog-head"><h2>Generate Daily Challenge</h2><button type="button" className="pm-admin-button" onClick={() => draftDialog.current?.close()} aria-label="Close"><X size={16}/></button></div><p>Choose a date using saved guidance. Validated content publishes automatically. Use the status table to retry failed dates.</p>{actionsDisabled && <p className="pm-admin-hint">Save settings and complete AI integration before generating a challenge.</p>}
            <form className="pm-ai-daily-generate" onSubmit={e => { e.preventDefault(); generation.post('/admin/ai/daily-challenge/generate', { preserveScroll: true, onSuccess: () => { draftDialog.current?.close(); document.getElementById('daily-generation-status')?.scrollIntoView({block: 'start', behavior: 'smooth'}); } }); }}>
                <label className="pm-admin-field"><span>Publication date (Dhaka)</span><input type="date" min={today} required value={generation.data.date} onChange={e => generation.setData('date', e.target.value)}/></label>
                <label className="pm-admin-field"><span>Exact title for this date (optional)</span>
                    <input maxLength={180} minLength={5} placeholder="Leave empty for an original AI title"
                        value={generation.data.exact_title} onChange={e => generation.setData('exact_title', e.target.value)}/>
                    {generation.errors.exact_title && <small className="pm-error">{generation.errors.exact_title}</small>}
                </label>
                <button className="pm-admin-button pm-admin-button-primary" disabled={actionsDisabled} type="submit">{generation.processing ? 'Queueing…' : 'Generate challenge'}</button>
                {generation.errors.date && <p className="pm-error" role="alert">{generation.errors.date}</p>}
            </form>
            </dialog>
        <div id="daily-generation-status"><Panel title="Generation status" action={<button className="pm-admin-button" type="button" disabled={refreshing || rowBusy !== null} onClick={refresh}><RefreshCw size={15}/> {refreshing ? 'Refreshing…' : 'Refresh status'}</button>}>
            <p className="pm-admin-hint">Challenges are generated automatically and published when due. No manual approval is required.</p>
            {!canGenerate && <p className="pm-feature-info"><AlertCircle size={16}/> New generation is unavailable. {canPublish ? 'Check the AI integration and readiness details. Validated content can still publish.' : 'Enable automatic generation and publication first.'}</p>}
            {form.isDirty && <p className="pm-admin-hint">Save your settings to use the latest generation guidance.</p>}
            {generationNotice && !rowError && <p role="status" className="pm-admin-notice pm-admin-notice-success">{generationNotice}</p>}
            {rowError && <p role="alert" className="pm-admin-notice pm-admin-notice-error">{rowError}</p>}
            <div className="pm-ai-daily-table-wrap"><table>{tableHead}<tbody>
                {activeDrafts.map(renderDraft)}
                {availableDates.map(date => <tr key={date}><td><strong>{date}</strong></td><td><span className="pm-daily-state is-neutral">Not generated</span></td><td>{date} · {settings.publish_time}</td><td>—</td><td><button type="button" className="pm-admin-button pm-admin-button-primary" disabled={actionsDisabled} onClick={() => perform(`daily-scenario:${date}`, '/admin/ai/daily-challenge/generate', { date })}><Sparkles size={15}/>{rowBusy === `daily-scenario:${date}` ? 'Queueing…' : 'Generate'}</button></td></tr>)}
                {!activeDrafts.length && !availableDates.length && <tr><td colSpan={5}>No active generation requests.</td></tr>}
            </tbody></table></div>
            {pastDrafts.length > 0 && <details className="pm-daily-history" open={pastDrafts.some(draft => draft.status === 'failed' || readyStatuses.includes(draft.status))}><summary>Previous dates and failure history ({pastDrafts.length})</summary><p className="pm-admin-hint">Recover failed dates or publish existing content to the closed archive. Published challenges and member responses are never overwritten.</p><div className="pm-ai-daily-table-wrap"><table>{tableHead}<tbody>{pastDrafts.map(renderDraft)}</tbody></table></div></details>}
        </Panel></div>
        <details className="pm-admin-panel pm-feature-details"><summary>Published challenges and expiry</summary>
            <div className="pm-ai-daily-heading"><div><h2>Published challenges and expiry</h2><p>Change the exact expiry of an individual challenge. Past or reached expiry closes discussions without removing responses or assessments.</p></div><Clock3 size={22}/></div>
            {recent.length === 0 ? <p className="pm-admin-hint">No AI-published daily challenges yet.</p> :
                <div className="pm-ai-daily-challenges">{recent.map(item => <article key={item.id} className="pm-ai-daily-challenge-row">
                    <div className="pm-ai-daily-challenge-meta"><div><strong>{item.daily_slot} · {item.title}</strong><small>{item.status} · Published: {dateLabel(item.published_at)} · Expires: {dateLabel(item.expires_at)}</small></div>
                        <Link href={`/scenarios/${encodeURIComponent(item.slug)}`} target="_blank">View challenge</Link></div>
                    <ExpiryEditor item={item} />
                </article>)}</div>}
            <button className="pm-admin-button" type="button" onClick={() => router.reload({ only: ['settings', 'readiness', 'recent', 'drafts', 'generationOptions', 'connection'] })}><RefreshCw size={15}/> Refresh status</button>
        </details>
        </div>
    </AdminLayout>;
}
