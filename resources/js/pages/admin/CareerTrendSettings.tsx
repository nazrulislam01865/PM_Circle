import { Head, useForm } from '@inertiajs/react';
import { CalendarDays, Clock3, ExternalLink, FileText, ShieldCheck, X, Bot } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AdminLayout } from '@/layouts/admin/AdminLayout';
import { AdminChoice } from '@/components/admin/AdminChoice';
import { AdminCreatableMultiChoice } from '@/components/admin/AdminCreatableMultiChoice';
import { publishingPreview } from '@/components/admin/career-trends/schedule';
import '../../../css/pm-career-trend-settings.css';

type Provider = 'openai' | 'gemini';
type Connection = { provider: Provider; label: string; model: string | null; connected: boolean; code: string | null; message: string; checked_at: string | null; pending?: boolean; request_id?: string };
type Settings = {
    ai_provider: Provider;
    frequency: string; publish_day: string; publish_time: string; timezone: string;
    lead_hours: string; publishing_mode: string; topics: string[]; target_levels: string[];
    market: string; language: string; title_pattern: string; sections: string[];
    source_policy: string; lookback_days: string; minimum_sources: string;
    include_source_links: boolean; include_source_dates: boolean; insufficient_sources: string;
};
type Option = { value: string; label: string };
type Props = { settings: Settings; options: Record<string, Option[]>; connections: Record<Provider, Connection> };
type SelectKey = Exclude<keyof Settings, 'ai_provider' | 'topics' | 'target_levels' | 'sections' | 'include_source_links' | 'include_source_dates' | 'title_pattern'>;

function SettingsPanel({ title, children }: { title: string; children: ReactNode }) {
    return <section className="pm-admin-panel pm-career-settings-panel"><h2>{title}</h2>{children}</section>;
}

function CheckField({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
    return <label className="pm-admin-check-row pm-career-settings-check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}/><span>{children}</span></label>;
}

const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4), minute = (i % 4) * 15;
    const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    return { value, label: `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}` };
});

export default function CareerTrendSettings({ settings, options, connections }: Props) {
    const form = useForm<Settings>(settings);
    const [tested, setTested] = useState<Partial<Record<Provider, Connection>>>({});
    const [testing, setTesting] = useState(false);
    const abortTest = useRef<AbortController | null>(null);
    useEffect(() => () => abortTest.current?.abort(), []);
    const [testError, setTestError] = useState('');
    const [dialog, setDialog] = useState<'draft' | 'connection'>('draft');
    const dialogRef = useRef<HTMLDialogElement>(null);
    const schedule = publishingPreview(form.data);
    const errorFor = (key: keyof Settings) => form.errors[key] ?? Object.entries(form.errors).find(([name]) => name.startsWith(`${key}.`))?.[1];
    const choice = (key: SelectKey, label: string) => <AdminChoice id={`career-trends-${key}`} label={label} value={form.data[key]}
        options={key === 'publish_time' ? (timeOptions.some(item => item.value === form.data.publish_time) ? timeOptions : [...timeOptions, { value: form.data.publish_time, label: form.data.publish_time }]) : options[key]}
        onChange={value => form.setData(key, value)} error={errorFor(key)} required/>;
    const multi = (key: 'topics' | 'target_levels', label: string) => <AdminCreatableMultiChoice id={`career-trends-${key}`} label={label} options={options[key]}
        value={form.data[key]} onChange={value => form.setData(key, value)} maxSelections={500} error={errorFor(key)}/>;
    const showDialog = (kind: 'draft' | 'connection') => { setDialog(kind); dialogRef.current?.showModal(); };
    const connection = tested[form.data.ai_provider] ?? connections[form.data.ai_provider];
    const testConnection = async () => {
        const provider = form.data.ai_provider;
        setTesting(true); setTestError('');
        const controller = new AbortController(); abortTest.current = controller;
        try {
            const response = await fetch('/admin/ai/career-trends/connection-test', {
                method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: {
                    Accept: 'application/json', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                }, body: JSON.stringify({ provider }),
            });
            if (!response.ok) throw new Error(response.status === 429 ? 'Too many tests. Try again shortly.' : `Unable to check connection (${response.status}).`);
            let result: Connection = await response.json();
            setTested(previous => ({ ...previous, [provider]: result }));
            const started = Date.now();
            while (result.pending && result.request_id && !controller.signal.aborted) {
                if (Date.now() - started > 180_000) throw new Error('Test still pending. Check the editorial queue and reload this page for the latest status.');
                await new Promise(resolve => setTimeout(resolve, 3000));
                const poll = await fetch(`/admin/ai/career-trends/connection-test/${encodeURIComponent(result.request_id)}`, {
                    credentials: 'same-origin', signal: controller.signal, headers: { Accept: 'application/json' },
                });
                if (!poll.ok) throw new Error(`Unable to read test status (${poll.status}).`);
                result = await poll.json();
                setTested(previous => ({ ...previous, [provider]: result }));
            }
        } catch (error) {
            if (controller.signal.aborted) return;
            const message = error instanceof Error ? error.message : 'Unable to check connection.';
            setTestError(message);
            setTested(previous => ({ ...previous, [provider]: { ...connections[provider], connected: false, code: 'TEST_FAILED', message, checked_at: null } }));
        } finally { if (!controller.signal.aborted) setTesting(false); }
    };
    const actions = <div className="pm-career-settings-actions"><button type="button" className="pm-admin-button pm-admin-button-quiet" onClick={() => showDialog('draft')}>Preview draft</button>
        <button type="submit" form="career-trends-settings" className="pm-admin-button pm-admin-button-primary" disabled={form.processing}>{form.processing ? 'Saving…' : 'Save settings'}</button></div>;

    return <AdminLayout title="Career Trends settings" subtitle="Configure how AI drafts and publishes your weekly reports." active="/admin/ai/career-trends" headingAction={actions}>
        <Head title="Career Trends settings | PM Circle"/>
        <form id="career-trends-settings" className="pm-career-settings" onSubmit={event => { event.preventDefault(); form.put('/admin/ai/career-trends', { preserveScroll: true }); }}>
            {form.recentlySuccessful && <p role="status" className="pm-admin-notice pm-admin-notice-success">Settings saved successfully.</p>}
            {form.hasErrors && <p role="alert" className="pm-admin-notice pm-admin-notice-error">Please correct the highlighted settings and try again.</p>}
            <div className="pm-career-settings-grid">
                <div className="pm-career-settings-column">
                    <SettingsPanel title="Schedule & approval">
                        {choice('frequency', 'Frequency')}{choice('publish_day', 'Publish day')}{choice('publish_time', 'Publish time')}
                        {choice('timezone', 'Time zone')}{choice('lead_hours', 'Draft lead time')}{choice('publishing_mode', 'Publishing mode')}
                    </SettingsPanel>
                    <SettingsPanel title="Topics & audience">
                        {multi('topics', 'Topics')}{multi('target_levels', 'Target levels')}{choice('market', 'Market')}{choice('language', 'Language')}
                    </SettingsPanel>
                    <SettingsPanel title="Report template">
                        <div className="pm-admin-field"><label htmlFor="career-trends-title">Title pattern</label><input id="career-trends-title" required maxLength={160} value={form.data.title_pattern} aria-invalid={!!errorFor('title_pattern') || undefined} onChange={e => form.setData('title_pattern', e.target.value)}/>{errorFor('title_pattern') && <small role="alert" className="pm-admin-error">{errorFor('title_pattern')}</small>}</div>
                        <fieldset className="pm-career-settings-sections"><legend>Sections</legend><div>{options.sections.map(option => <CheckField key={option.value} checked={form.data.sections.includes(option.value)} onChange={checked => form.setData('sections', checked ? [...form.data.sections, option.value] : form.data.sections.filter(value => value !== option.value))}>{option.label}</CheckField>)}{errorFor('sections') && <small role="alert" className="pm-admin-error">{errorFor('sections')}</small>}</div></fieldset>
                    </SettingsPanel>
                </div>
                <div className="pm-career-settings-column">
                    <SettingsPanel title="AI integration"><div className="pm-career-settings-integration">
                        <div className="pm-career-settings-provider-icon">{form.data.ai_provider === 'openai' ? <img src="/images/admin/career-trends-openai.webp" alt="" width={44} height={44}/> : <Bot aria-hidden="true" size={32}/>}</div><div className="pm-career-settings-provider"><strong>{connection.label}</strong><span className={`pm-career-settings-status ${connection.pending ? '' : connection.connected ? 'is-configured' : 'is-disconnected'}`}><i aria-hidden="true"/>{connection.pending ? 'Testing…' : connection.connected ? 'Connected' : 'Disconnected'}</span><small className="pm-admin-hint">{connection.model ?? 'No model configured'}</small>{connection.checked_at && <small className="pm-admin-hint">Checked {new Date(connection.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>}{!connection.connected && <small className={connection.pending ? "pm-admin-hint" : "pm-admin-error"}>{connection.message}</small>}{form.data.ai_provider !== settings.ai_provider && <small className="pm-admin-hint">Unsaved provider selection</small>}</div>
                        <button type="button" className="pm-career-settings-connection" onClick={() => showDialog('connection')}>Manage connection <ExternalLink size={18} aria-hidden="true"/></button>
                    </div></SettingsPanel>
                    <SettingsPanel title="Sources & quality">
                        {choice('source_policy', 'Sources')}{choice('lookback_days', 'Lookback')}{choice('minimum_sources', 'Minimum sources')}
                        <div className="pm-career-settings-quality-checks"><CheckField checked={form.data.include_source_links} onChange={checked => form.setData('include_source_links', checked)}>Include source links</CheckField><CheckField checked={form.data.include_source_dates} onChange={checked => form.setData('include_source_dates', checked)}>Include source dates</CheckField></div>
                        {choice('insufficient_sources', 'If sources are insufficient')}
                    </SettingsPanel>
                    <SettingsPanel title="Publishing preview"><div className="pm-career-settings-preview" aria-live="polite" title="Proposed schedule; automatic scheduling is not active">
                        <div><FileText aria-hidden="true"/><span>Next draft</span><span>{schedule.draft}</span></div>
                        <div><CalendarDays aria-hidden="true"/><span>Next publish</span><span>{schedule.publish}</span></div>
                        <div><Clock3 aria-hidden="true"/><span>{form.data.timezone === 'Asia/Dhaka' ? 'Bangladesh time' : form.data.timezone}</span></div>
                        <div><ShieldCheck aria-hidden="true"/><span>Approval required</span></div>
                    </div></SettingsPanel>
                </div>
            </div>
        </form>
        <dialog ref={dialogRef} className="pm-career-settings-dialog" aria-labelledby="career-dialog-title">
            <div className="pm-career-settings-dialog-head"><h2 id="career-dialog-title">{dialog === 'draft' ? 'Preview draft' : 'Manage connection'}</h2><button type="button" className="pm-admin-button" aria-label="Close dialog" onClick={() => dialogRef.current?.close()}><X size={18}/></button></div>
            {dialog === 'draft' ? <><p className="pm-admin-hint">Template preview only. No AI request is made. Automatic draft generation and scheduled publication are not active.</p><h3>{form.data.title_pattern.replaceAll('{week_start}', schedule.weekStart)}</h3><p>Proposed publication: {schedule.publish} ({form.data.timezone})</p><ul>{options.sections.filter(option => form.data.sections.includes(option.value)).map(option => <li key={option.value}>{option.label}</li>)}</ul></> : <>
                <AdminChoice id="career-provider" label="AI provider" portalContainer={dialogRef.current} disabled={testing} value={form.data.ai_provider} options={Object.values(connections).map(item => ({ value: item.provider, label: item.label }))} onChange={value => { if (!testing && (value === 'openai' || value === 'gemini')) { form.setData('ai_provider', value); setTestError(''); } }}/>
                <p><strong>{connection.label}</strong> · {connection.model ?? 'No model configured'}</p>
                <span className={`pm-career-settings-status ${connection.pending ? '' : connection.connected ? 'is-configured' : 'is-disconnected'}`}><i aria-hidden="true"/>{connection.pending ? 'Testing…' : connection.connected ? 'Connected' : 'Disconnected'}</span>
                <p role="status">{connection.message}</p>{connection.checked_at && <p className="pm-admin-hint">Last checked: {new Date(connection.checked_at).toLocaleString()}</p>}
                {testError && <p className="pm-admin-error" role="alert">{testError}</p>}
                <p className="pm-admin-hint">Test makes a small, budgeted generation request and verifies mandatory moderation. It does not create or publish a report. Credentials are configured on the server. Select a provider here, then Save settings to apply it to new Career Trends drafts.</p>
                <div className="pm-career-settings-dialog-actions"><button type="button" className="pm-admin-button pm-admin-button-quiet" disabled={testing} onClick={testConnection}>{testing ? 'Testing…' : 'Test connection'}</button><button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => dialogRef.current?.close()}>Use selection</button></div>
            </>}
            {dialog === 'draft' && <button type="button" className="pm-admin-button pm-admin-button-primary" onClick={() => dialogRef.current?.close()}>Close</button>}
        </dialog>
    </AdminLayout>;
}
